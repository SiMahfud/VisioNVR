import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { getCamera, updateCameraStatus } from '@/lib/db';

// This is a simple in-memory store. For a production application, you would
// want a more robust way to manage and persist recording processes, especially
// across server restarts.
const runningRecorders = new Map<string, ffmpeg.FfmpegCommand>();

export async function POST(request: NextRequest) {
  try {
    const { cameraId } = await request.json();

    if (!cameraId) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    if (runningRecorders.has(cameraId)) {
      return NextResponse.json({ error: 'Camera is already recording' }, { status: 409 });
    }

    const camera = await getCamera(cameraId);

    if (!camera || !camera.rtspUrl) {
      return NextResponse.json({ error: 'Camera not found or RTSP URL not configured' }, { status: 404 });
    }

    const recordingsDir = path.join(process.cwd(), 'recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputPath = path.join(recordingsDir, `${camera.id}-${timestamp}.mp4`);

    console.log(`Starting recording for ${camera.name} (${camera.rtspUrl})`);
    console.log(`Output file: ${outputPath}`);

    const command = ffmpeg(camera.rtspUrl)
      .inputOptions(['-rtsp_transport tcp'])
      .videoCodec('copy') // Re-mux instead of re-encoding for performance
      .outputOptions(['-f segment', '-segment_time 600', '-reset_timestamps 1'])
      .on('start', (commandLine) => {
        console.log(`FFmpeg started for ${camera.id}: ${commandLine}`);
        runningRecorders.set(camera.id, command);
        updateCameraStatus(camera.id, 'recording').catch(console.error);
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`FFmpeg error for ${camera.id}:`, err.message);
        console.error('FFmpeg stderr:', stderr);
        runningRecorders.delete(camera.id);
        updateCameraStatus(camera.id, 'online').catch(console.error); // Set status back to online if recording fails
      })
      .on('end', () => {
        console.log(`Recording finished for ${camera.id}`);
        runningRecorders.delete(camera.id);
        updateCameraStatus(camera.id, 'online').catch(console.error);
      })
      .save(outputPath);
      // Using .save() for continuous recording might not be the best approach.
      // For long-running recordings, piping the output might be more suitable.
      // This setup is a starting point.

    return NextResponse.json({ message: `Recording started for camera ${cameraId}`, file: outputPath }, { status: 200 });

  } catch (error) {
    console.error('API Error starting recording:', error);
    return NextResponse.json({ error: 'Failed to start recording' }, { status: 500 });
  }
}
