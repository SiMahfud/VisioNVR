
import { NextRequest, NextResponse } from 'next/server';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';

// Set the path to the ffmpeg executable if it's not in the system's PATH.
// Ini mungkin diperlukan di beberapa lingkungan production.
// import ffmpeg from 'fluent-ffmpeg';
// ffmpeg.setFfmpegPath('/path/to/your/ffmpeg');

const HLS_OUTPUT_DIR = path.join(process.cwd(), 'public', 'hls');

// Pastikan direktori output HLS ada
if (!fs.existsSync(HLS_OUTPUT_DIR)) {
  fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
}

// Penyimpanan dalam memori untuk melacak proses ffmpeg yang berjalan
const runningProcesses = new Map<string, ChildProcessWithoutNullStreams>();

async function waitForFile(filePath: string, timeout = 5000): Promise<boolean> {
  const pollInterval = 500;
  const endTime = Date.now() + timeout;
  while (Date.now() < endTime) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { cameraId: string } }
) {
  const { cameraId } = params;

  let rtspUrl = '';
  try {
    // URL RTSP di-encode dalam parameter cameraId dari klien
    rtspUrl = Buffer.from(cameraId, 'base64').toString('utf8');
  } catch (err) {
    return new NextResponse('Invalid camera ID encoding', { status: 400 });
  }

  if (!rtspUrl.startsWith('rtsp://')) {
    return new NextResponse('Invalid RTSP URL', { status: 400 });
  }

  const streamOutputDir = path.join(HLS_OUTPUT_DIR, cameraId);
  const m3u8File = path.join(streamOutputDir, 'stream.m3u8');

  // Jika proses sudah berjalan, langsung gunakan kembali
  if (!runningProcesses.has(cameraId)) {
    console.log(`Starting new ffmpeg process for ${rtspUrl}`);
    
    // Pastikan direktori stream bersih sebelum memulai
    if (fs.existsSync(streamOutputDir)) {
        fs.rmSync(streamOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(streamOutputDir, { recursive: true });

    const commandArgs = [
        '-rtsp_transport', 'tcp',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-i', rtspUrl,
        '-an', // No audio
        '-vcodec', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-crf', '28',
        '-g', '30', // GOP size
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+program_date_time',
        '-hls_segment_filename', path.join(streamOutputDir, 'segment_%03d.ts'),
        m3u8File
    ];

    const command = spawn('ffmpeg', commandArgs, { detached: false });
    runningProcesses.set(cameraId, command);

    command.stdout.on('data', (data) => {
        // stdout jarang digunakan, biasanya output di stderr
    });

    command.stderr.on('data', (data) => {
        // Jangan membanjiri log, tetapi ini berguna untuk debugging
        // console.log(`[ffmpeg stderr] ${cameraId}: ${data.toString()}`);
    });

    command.on('error', (err) => {
        console.error(`[ffmpeg error] Failed to start process for ${cameraId}:`, err);
        runningProcesses.delete(cameraId);
    });

    command.on('close', (code) => {
        console.log(`[ffmpeg close] Process for ${cameraId} exited with code ${code}`);
        runningProcesses.delete(cameraId);
        // Bersihkan file saat proses berhenti
        if (fs.existsSync(streamOutputDir)) {
            // fs.rmSync(streamOutputDir, { recursive: true, force: true });
        }
    });

  } else {
    console.log(`Re-using existing ffmpeg process for ${cameraId}`);
  }

  // Tunggu hingga file m3u8 dibuat
  const fileExists = await waitForFile(m3u8File);
  if (!fileExists) {
    console.error(`Timeout waiting for m3u8 file for stream: ${cameraId}`);
    return new NextResponse('Stream could not be started.', { status: 500 });
  }

  // Sajikan konten playlist m3u8, bukan redirect
  try {
      const playlistContent = fs.readFileSync(m3u8File, 'utf-8');
      return new NextResponse(playlistContent, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache',
        },
      });
  } catch (error) {
       console.error(`Could not read playlist file ${m3u8File}:`, error);
       return new NextResponse('Could not read playlist file.', { status: 500 });
  }
}
