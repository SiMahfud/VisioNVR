
import { NextRequest, NextResponse } from 'next/server';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';

const HLS_OUTPUT_DIR = path.join(process.cwd(), 'hls_output');

// Pastikan direktori output HLS ada di luar /public
if (!fs.existsSync(HLS_OUTPUT_DIR)) {
  fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
}

const runningProcesses = new Map<string, ChildProcessWithoutNullStreams>();

async function waitForFile(filePath: string, timeout = 10000): Promise<boolean> {
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
    rtspUrl = Buffer.from(cameraId, 'base64').toString('utf8');
  } catch (err) {
    console.error(`Error decoding cameraId: ${cameraId}`, err);
    return new NextResponse('Invalid camera ID encoding', { status: 400 });
  }

  if (!rtspUrl.startsWith('rtsp://')) {
    return new NextResponse(`Invalid RTSP URL: ${rtspUrl}`, { status: 400 });
  }

  const streamOutputDir = path.join(HLS_OUTPUT_DIR, cameraId);
  const m3u8File = path.join(streamOutputDir, 'stream.m3u8');

  // Jika proses belum berjalan, mulai
  if (!runningProcesses.has(cameraId)) {
    console.log(`[ffmpeg] Starting new process for ${rtspUrl}`);
    
    if (fs.existsSync(streamOutputDir)) {
        fs.rmSync(streamOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(streamOutputDir, { recursive: true });

    const commandArgs = [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-an',
        '-c:v', 'copy',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+program_date_time',
        '-hls_segment_filename', path.join(streamOutputDir, 'segment_%03d.ts'),
        m3u8File
    ];

    const ffmpegProcess = spawn('ffmpeg', commandArgs, { detached: false });
    runningProcesses.set(cameraId, ffmpegProcess);

    ffmpegProcess.stderr.on('data', (data) => {
        console.log(`[ffmpeg stderr] ${cameraId}: ${data.toString().trim()}`);
    });

    ffmpegProcess.on('error', (err) => {
        console.error(`[ffmpeg error] Failed to start process for ${cameraId}:`, err);
        runningProcesses.delete(cameraId);
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`[ffmpeg close] Process for ${cameraId} exited with code ${code}`);
        runningProcesses.delete(cameraId);
        if (fs.existsSync(streamOutputDir)) {
            fs.rmSync(streamOutputDir, { recursive: true, force: true });
        }
    });
  }

  // Tunggu hingga file m3u8 dibuat
  const fileExists = await waitForFile(m3u8File, 15000);
  if (!fileExists) {
    console.error(`[ffmpeg] Timeout waiting for m3u8 file: ${m3u8File}`);
    const process = runningProcesses.get(cameraId);
    if (process) {
        process.kill();
        runningProcesses.delete(cameraId);
    }
    return new NextResponse('Stream could not be started in time.', { status: 504 });
  }

  // Baca dan sajikan file m3u8
  try {
    const playlistContent = fs.readFileSync(m3u8File, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(playlistContent, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error(`Error reading m3u8 file: ${m3u8File}`, error);
    return new NextResponse('Error reading stream playlist.', { status: 500 });
  }
}
