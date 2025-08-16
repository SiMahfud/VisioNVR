import { NextResponse } from 'next/server';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

// In-memory map to manage active FFmpeg streams for preview
// Key: rtspUrl (base64 encoded), Value: FFmpeg process
export const previewStreams = new Map<string, ChildProcessWithoutNullStreams>();

export async function POST(request: Request) {
    try {
        const { rtspUrl } = await request.json() as { rtspUrl: string };

        if (!rtspUrl) {
            return NextResponse.json({ error: 'RTSP URL is required' }, { status: 400 });
        }

        // Create a unique identifier for this RTSP URL
        const previewId = Buffer.from(rtspUrl, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

        if (previewStreams.has(previewId)) {
            console.log(`[Preview Stream] FFmpeg for ${previewId} is already running.`);
            return NextResponse.json({ message: `Preview stream started for ${previewId}`, previewId }, { status: 200 });
        }

        console.log(`[Preview Stream] Starting FFmpeg for RTSP URL: ${rtspUrl}`);

        const ffmpegArgs = [
            '-rtsp_transport', 'tcp',
            '-i', rtspUrl,
            '-an',                      // No audio for low-latency streaming
            '-c:v', 'mpeg1video',       // JSMPEG requires mpeg1video
            '-q:v', '7',                // Video quality (1-31, lower is better)
            '-b:v', '1000k',            // Bitrate
            '-r', '25',                 // Frame rate
            '-f', 'mpegts',             // JSMPEG requires mpegts container
            '-',                        // Output to stdout
        ];

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] }) as unknown as ChildProcessWithoutNullStreams;
        previewStreams.set(previewId, ffmpegProcess);

        // Setup WebSocket broadcasting if the function is available
        if (global.setupPreviewBroadcast) {
            global.setupPreviewBroadcast(previewId, ffmpegProcess);
        } else {
            // Fallback error handling if setupPreviewBroadcast is not available
            ffmpegProcess.stderr.on('data', (data) => {
                console.error(`[FFmpeg Preview ${previewId}] stderr: ${data}`);
            });

            ffmpegProcess.on('close', (code) => {
                console.log(`[FFmpeg Preview ${previewId}] Process closed with code ${code}`);
                previewStreams.delete(previewId);
            });

            ffmpegProcess.on('error', (err) => {
                console.error(`[Preview Stream] Failed to start FFmpeg for ${previewId}:`, err);
                previewStreams.delete(previewId);
            });
        }

        return NextResponse.json({ message: `Preview stream started for ${previewId}`, previewId }, { status: 200 });
    } catch (error) {
        console.error("API Route Error starting preview stream:", error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { rtspUrl } = await request.json() as { rtspUrl: string };

        if (!rtspUrl) {
            return NextResponse.json({ error: 'RTSP URL is required' }, { status: 400 });
        }

        const previewId = Buffer.from(rtspUrl, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        const process = previewStreams.get(previewId);
        
        if (process) {
            console.log(`[Preview Stream] Killing FFmpeg process for ${previewId}.`);
            process.kill('SIGINT');
            previewStreams.delete(previewId);
            return NextResponse.json({ message: `Preview stream stopped for ${previewId}` }, { status: 200 });
        } else {
            return NextResponse.json({ message: `No active preview stream found for ${previewId}` }, { status: 404 });
        }
    } catch (error) {
        console.error("API Route Error stopping preview stream:", error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
