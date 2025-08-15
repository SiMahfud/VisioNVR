
import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { Buffer } from 'buffer'; // Import Buffer

const pipelineAsync = promisify(pipeline);
// Set the path to the ffmpeg executable if it's not in the system's PATH.
// This might be necessary in some deployment environments.
// ffmpeg.setFfmpegPath('/path/to/your/ffmpeg');

const HLS_OUTPUT_DIR = path.join(process.cwd(), 'public', 'hls');

// Ensure the HLS output directory exists
if (!fs.existsSync(HLS_OUTPUT_DIR)) {
  fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
}

// In-memory store to track running ffmpeg processes
const runningProcesses = new Map<string, ffmpeg.FfmpegCommand>();

export async function GET(
  request: NextRequest,
  { params }: { params: { cameraId: string } }
) {
  // Correctly access the cameraId from params
  const cameraId = params.cameraId;

  // The RTSP URL is encoded in the cameraId parameter from the client
  const rtspUrl = atob(cameraId);

  if (!rtspUrl) {
    return new NextResponse('Invalid camera ID', { status: 400 });
  }

  const streamOutputDir = path.join(HLS_OUTPUT_DIR, cameraId);

  // Clean up old segments for this stream if they exist
  if (fs.existsSync(streamOutputDir)) {
    // Check if there is a running process first
    if (runningProcesses.has(cameraId)) {
        console.log(`HLS stream for ${cameraId} already running.`);
    } else {
        console.log(`Cleaning up old HLS files for ${cameraId}`);
        fs.rmSync(streamOutputDir, { recursive: true, force: true });
    }
  }
  
  if (!fs.existsSync(streamOutputDir)) {
      fs.mkdirSync(streamOutputDir, { recursive: true });
  }

  const m3u8File = path.join(streamOutputDir, 'stream.m3u8');
  
  // If the process is already running, just return the path
  if (runningProcesses.has(cameraId)) {
    console.log(`Re-using existing ffmpeg process for ${rtspUrl}`);
  } else {
    console.log(`Starting new ffmpeg process for ${rtspUrl}`);

    const command = ffmpeg(rtspUrl, { logger: console })
      // Input options
      .inputOptions([
        '-rtsp_transport tcp', // Use TCP for more reliable connection
        '-fflags nobuffer',
        '-flags low_delay',
      ])
      // Video options
      .noAudio() // We don't need audio for a security camera preview
      .videoCodec('libx264')
      .outputOptions([
        '-preset veryfast',
        '-tune zerolatency',
        '-crf 28', // Constant Rate Factor (quality vs. size, lower is better quality)
        '-g 30', // Group of Pictures (keyframe interval)
      ])
      // HLS options
      .outputOptions([
        '-hls_time 2', // 2-second segments
        '-hls_list_size 3', // Keep 3 segments in the playlist
        '-hls_flags delete_segments+program_date_time', // Delete old segments
        '-hls_segment_filename', `${streamOutputDir}/segment_%03d.ts`
      ])
      .output(m3u8File)
      .on('start', (commandLine) => {
        console.log('FFmpeg started with command: ' + commandLine);
        runningProcesses.set(cameraId, command);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        runningProcesses.delete(cameraId);
      })
      .on('end', () => {
        console.log('FFmpeg process finished.');
        runningProcesses.delete(cameraId);
         // Clean up files on exit
        if (fs.existsSync(streamOutputDir)) {
            fs.rmSync(streamOutputDir, { recursive: true, force: true });
        }
      });
      
    command.run();
  }

  // It can take a moment for the m3u8 file to be created.
  // We'll wait for a short period before responding.
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(m3u8File)) {
        break;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!fs.existsSync(m3u8File)) {
    return new NextResponse('Stream could not be started.', { status: 500 });
  }

  // Instead of serving the file directly, we redirect to the public path.
  // The Next.js dev server or a production static file server will handle serving it.
  const playlistUrl = `/hls/${cameraId}/stream.m3u8`;
  
  // We need to return the playlist content, not redirect. HLS.js will fetch it.
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
       return new NextResponse('Could not read playlist file.', { status: 500 });
  }
}

// We need a way to stop the ffmpeg process when the client disconnects.
// The `NextRequest` doesn't directly expose a 'close' or 'abort' event.
// For a production app, a more robust solution involving WebSockets or
// a separate cleanup mechanism would be needed to stop orphaned ffmpeg processes.
