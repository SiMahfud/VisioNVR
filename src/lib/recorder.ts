
'use server';

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getCameras, type Camera, updateCameraStatus, getAppSetting } from './db';

// const MAX_STORAGE_BYTES = 500 * 1024 * 1024 * 1024; // 500 GB
const SEGMENT_DURATION_SECONDS = 300; // 5 menit
const RETRY_INTERVAL_MS = 10000; // 10 detik
const RECORDINGS_BASE_DIR = path.join(process.cwd(), 'recordings');

// In-memory map to keep track of running ffmpeg processes
const runningRecorders = new Map<string, ChildProcessWithoutNullStreams>();

// --- Directory and File Management ---

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Recorder] Created directory: ${dir}`);
  }
}

function getFolderSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  
  const files = fs.readdirSync(dir);
  let totalSize = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      totalSize += getFolderSize(filePath);
    } else {
      totalSize += stats.size;
    }
  }
  return totalSize;
}

async function cleanupOldFiles() {
  try {
    const maxStorageGb = await getAppSetting('maxStorageGb');
    const maxSize = (Number(maxStorageGb) || 500) * 1024 * 1024 * 1024;

    let totalSize = getFolderSize(RECORDINGS_BASE_DIR);
    if (totalSize <= maxSize) return;

    console.log(`[Recorder] Storage usage (${(totalSize / (1024**3)).toFixed(2)}GB) exceeds limit (${(maxSize / (1024**3)).toFixed(2)}GB). Cleaning up...`);

    const allFiles = getAllFiles(RECORDINGS_BASE_DIR)
      .map(filePath => ({
        path: filePath,
        time: fs.statSync(filePath).mtime.getTime(),
      }))
      .sort((a, b) => a.time - b.time);

    for (const file of allFiles) {
      if (totalSize <= maxSize) break;
      
      try {
        const fileSize = fs.statSync(file.path).size;
        fs.unlinkSync(file.path);
        totalSize -= fileSize;
        console.log(`[Recorder] Deleted old file: ${file.path}`);
      } catch (err) {
        console.error(`[Recorder] Failed to delete file ${file.path}:`, err);
      }
    }
  } catch(e) {
      console.error(`[Recorder] Error during cleanup:`, e);
  }
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}


// --- Recorder Process Management ---

async function startRecording(camera: Camera) {
  if (runningRecorders.has(camera.id)) {
    console.log(`[${camera.name}] Recorder is already running.`);
    return;
  }
  if (!camera.rtspUrl) {
    console.log(`[${camera.name}] No RTSP URL configured. Skipping.`);
    return;
  }

  const camDir = path.join(RECORDINGS_BASE_DIR, camera.id);
  ensureDir(camDir);

  console.log(`[${camera.name}] Starting recording...`);

  // Arguments for ffmpeg
  const ffmpegArgs = [
    '-rtsp_transport', 'tcp', // Use TCP for more reliable connection
    '-i', camera.rtspUrl,      // Input from camera's RTSP stream
    '-c:v', 'copy',            // Copy video stream without re-encoding
    '-c:a', 'aac',             // Re-encode audio to AAC (a common choice)
    '-f', 'segment',           // Use the segment muxer
    '-segment_time', SEGMENT_DURATION_SECONDS.toString(),
    '-segment_format', 'mp4',  // Output MP4 segments
    '-strftime', '1',          // Allow use of date/time in filename
    '-reset_timestamps', '1',  // Reset timestamps for each segment
    path.join(camDir, `${camera.id}-%Y%m%d-%H%M%S.mp4`) // Output filename pattern
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
  runningRecorders.set(camera.id, ffmpegProcess);

  await updateCameraStatus(camera.id, 'recording');

  // --- Event Handlers for the Process ---
  ffmpegProcess.stdout.on('data', (data) => {
    // Usually ffmpeg outputs to stderr, but we capture stdout just in case.
    console.log(`[${camera.name} - STDOUT] ${data.toString()}`);
  });
  
  ffmpegProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    // Log ffmpeg's progress without flooding the console
    if (msg.startsWith('frame=')) {
        // Can be useful for debugging, but too verbose for normal operation.
    } else {
       console.log(`[${camera.name}] ${msg.trim()}`);
    }

    if(msg.includes("Opening '") && msg.includes(".mp4' for writing")) {
       console.log(`[${camera.name}] New segment created. Checking storage...`);
       cleanupOldFiles();
    }
  });

  ffmpegProcess.on('close', async (code) => {
    console.log(`[${camera.name}] FFmpeg process closed with code ${code}.`);
    runningRecorders.delete(camera.id);

    // If the process exited unexpectedly, try to restart it.
    if (code !== 0 && code !== 255) { // 255 is often from manual kill
      console.error(`[${camera.name}] Recording stopped unexpectedly. Retrying in ${RETRY_INTERVAL_MS / 1000}s...`);
      await updateCameraStatus(camera.id, 'offline');
      setTimeout(() => startRecording(camera), RETRY_INTERVAL_MS);
    } else {
        await updateCameraStatus(camera.id, 'online');
    }
  });

  ffmpegProcess.on('error', async (err) => {
    console.error(`[${camera.name}] Failed to start FFmpeg process:`, err);
    runningRecorders.delete(camera.id);
    await updateCameraStatus(camera.id, 'offline');
    setTimeout(() => startRecording(camera), RETRY_INTERVAL_MS);
  });
}

function stopRecording(cameraId: string) {
  const process = runningRecorders.get(cameraId);
  if (process) {
    console.log(`[Recorder] Stopping recording for camera ID: ${cameraId}`);
    process.kill('SIGINT'); // Gracefully stop ffmpeg
    runningRecorders.delete(cameraId);
  }
}

// --- Main Service Logic ---

export async function startAllRecorders() {
  console.log('[Recorder] Initializing recording service...');
  ensureDir(RECORDINGS_BASE_DIR);
  
  const allCameras = await getCameras();
  const camerasToRecord = allCameras.filter(cam => cam.enabled && cam.recordingMode === 'continuous');

  console.log(`[Recorder] Found ${camerasToRecord.length} cameras set for continuous recording.`);

  for (const camera of camerasToRecord) {
    await startRecording(camera);
  }

  // Periodically check storage, e.g., every hour
  setInterval(() => cleanupOldFiles(), 60 * 60 * 1000);
}

// --- Status and Control ---
export function getRecorderStatus() {
    const status: Record<string, boolean> = {};
    for (const cameraId of runningRecorders.keys()) {
        status[cameraId] = true;
    }
    return status;
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('[Recorder] SIGINT received. Shutting down all recorders...');
    runningRecorders.forEach((_, cameraId) => {
        stopRecording(cameraId);
    });
    process.exit(0);
});
