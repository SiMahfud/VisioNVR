
'use server';

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getCameras, type Camera, updateCameraStatus, getAppSetting, getCamera } from './db';
import { webSocketStreams } from '../dev-server'; // Import the shared map

// --- Constants ---
const RECORDINGS_BASE_DIR = path.join(process.cwd(), 'records');

// --- Directory and File Management ---
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Recorder] Created directory: ${dir}`);
  }
}

// --- Recorder Process Management ---

async function startContinuousRecording(camera: Camera) {
  if (!camera.rtspUrl) {
    console.log(`[${camera.name}] No RTSP URL for continuous recording. Skipping.`);
    return;
  }

  const camDir = path.join(RECORDINGS_BASE_DIR, camera.id);
  ensureDir(camDir);

  console.log(`[${camera.name}] Starting continuous recording...`);

  const ffmpegArgs = [
    '-rtsp_transport', 'tcp',
    '-i', camera.rtspUrl,
    '-c:v', 'copy',
    '-an', // No audio in recordings for simplicity, can be changed to '-c:a', 'copy'
    '-f', 'segment',
    '-segment_time', '300', // 5 minutes per file
    '-segment_format', 'mp4',
    '-strftime', '1',
    '-reset_timestamps', '1',
    path.join(camDir, `record-%Y%m%d-%H%M%S.mp4`)
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.on('error', (err) => {
    console.error(`[${camera.name}] Continuous record process error:`, err);
  });
  
  ffmpegProcess.stderr.on('data', (data) => {
    // console.log(`[${camera.name} Cont-Rec]: ${data.toString().trim()}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`[${camera.name}] Continuous recording process stopped with code ${code}.`);
    // Optional: add restart logic here if needed
  });
}

// --- Live Streaming (WebSocket) Process Management ---

export async function startStreamForCamera(cameraId: string): Promise<boolean> {
    if (webSocketStreams.has(cameraId)) {
        console.log(`[WebSocket Stream] FFmpeg for ${cameraId} is already running.`);
        return true;
    }

    const camera = await getCamera(cameraId);
    if (!camera || !camera.rtspUrl) {
        console.error(`[WebSocket Stream] Camera ${cameraId} not found or has no RTSP URL.`);
        return false;
    }

    console.log(`[WebSocket Stream] Starting FFmpeg for ${cameraId}...`);

    const ffmpegArgs = [
        '-rtsp_transport', 'tcp',
        '-i', camera.rtspUrl,
        '-an',                      // No audio for low-latency streaming
        '-c:v', 'mpeg1video',       // JSMPEG requires mpeg1video
        '-q:v', '7',                // Video quality (1-31, lower is better)
        '-b:v', '1000k',            // Bitrate
        '-r', '25',                 // Frame rate
        '-f', 'mpegts',             // JSMPEG requires mpegts container
        '-',                        // Output to stdout
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] })  as unknown as ChildProcessWithoutNullStreams;;
    webSocketStreams.set(cameraId, ffmpegProcess);

    ffmpegProcess.stderr.on('data', (data) => {
        // console.error(`[FFmpeg STDERR ${cameraId}]: ${data.toString()}`);
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`[WebSocket Stream] FFmpeg for ${cameraId} exited with code ${code}.`);
        webSocketStreams.delete(cameraId);
    });
    
    ffmpegProcess.on('error', (err) => {
      console.error(`[WebSocket Stream] Failed to start FFmpeg for ${cameraId}:`, err);
      webSocketStreams.delete(cameraId);
    });

    return true;
}

export async function stopStreamForCamera(cameraId: string) {
    const process = webSocketStreams.get(cameraId);
    if (process) {
        console.log(`[WebSocket Stream] Killing FFmpeg process for ${cameraId}.`);
        process.kill('SIGINT');
        webSocketStreams.delete(cameraId);
    }
}

// --- Main Service Logic ---

export async function startAllRecorders() {
  console.log('[Recorder] Initializing recording service...');
  ensureDir(RECORDINGS_BASE_DIR);
  
  const allCameras = await getCameras();
  const camerasToRecord = allCameras.filter(cam => cam.enabled && cam.recordingMode === 'continuous');

  console.log(`[Recorder] Found ${camerasToRecord.length} cameras for continuous recording.`);

  for (const camera of camerasToRecord) {
    await startContinuousRecording(camera);
  }
}

// --- Status and Control ---
export async function getRecorderStatus() {
    // This function can be expanded if needed.
    return {};
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('[Recorder] SIGINT received. Shutting down all recorders and streams...');
    webSocketStreams.forEach((_, cameraId) => {
        stopStreamForCamera(cameraId);
    });
    // Add logic here to stop continuous recorders if they are tracked.
    process.exit(0);
});
