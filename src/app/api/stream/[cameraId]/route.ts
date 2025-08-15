
import { NextRequest, NextResponse } from 'next/server';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';

// BENAR: Direktori output sekarang berada di dalam folder `public`
const HLS_BASE_DIR = path.join(process.cwd(), 'public', 'hls');

// Pastikan direktori HLS dasar ada
if (!fs.existsSync(HLS_BASE_DIR)) {
  fs.mkdirSync(HLS_BASE_DIR, { recursive: true });
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

export async function POST(
  request: NextRequest,
  { params }: { params: { cameraId: string } }
) {
  const { cameraId } = params;

  let rtspUrl = '';
  try {
    // Decode a URL-safe base64 string
    const base64 = cameraId.replace(/-/g, '+').replace(/_/g, '/');
    rtspUrl = Buffer.from(base64, 'base64').toString('utf8');
  } catch (err) {
    console.error(`Error decoding cameraId: ${cameraId}`, err);
    return new NextResponse('Invalid camera ID encoding', { status: 400 });
  }

  if (!rtspUrl.startsWith('rtsp://')) {
    return new NextResponse(`Invalid RTSP URL: ${rtspUrl}`, { status: 400 });
  }

  const streamOutputDir = path.join(HLS_BASE_DIR, cameraId);
  const m3u8File = path.join(streamOutputDir, 'stream.m3u8');

  // Jika proses sudah berjalan, cukup konfirmasi OK.
  if (runningProcesses.has(cameraId)) {
      console.log(`[ffmpeg] Stream for ${cameraId} is already running.`);
      return new NextResponse('Stream already running', { status: 200 });
  }
  
  // Jika proses tidak berjalan tetapi file playlist ada, anggap stream macet. Hapus dan mulai ulang.
  if (fs.existsSync(streamOutputDir)) {
      console.log(`[ffmpeg] Found stale directory for ${cameraId}. Cleaning up...`);
      fs.rmSync(streamOutputDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(streamOutputDir, { recursive: true });

  const commandArgs = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-an', // Nonaktifkan audio
      '-c:v', 'copy', // Salin codec video tanpa transkoding
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments+program_date_time',
      '-hls_segment_filename', path.join(streamOutputDir, 'segment_%03d.ts'),
      m3u8File
  ];

  console.log(`[ffmpeg] Starting new process for ${cameraId}: ffmpeg ${commandArgs.join(' ')}`);
  const ffmpegProcess = spawn('ffmpeg', commandArgs, { detached: false });
  runningProcesses.set(cameraId, ffmpegProcess);

  ffmpegProcess.stderr.on('data', (data) => {
      // console.log(`[ffmpeg stderr] ${cameraId}: ${data.toString().trim()}`);
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

  // Tunggu hingga file m3u8 dibuat sebelum mengembalikan respons
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

  // Cukup kembalikan OK. Klien akan meminta file dari /hls/${cameraId}/stream.m3u8
  return new NextResponse('Stream started successfully', { status: 200 });
}
