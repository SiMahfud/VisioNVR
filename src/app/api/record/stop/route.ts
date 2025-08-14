import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { updateCameraStatus } from '@/lib/db';


// This needs to be the same instance as in start/route.ts.
// In a real multi-server or serverless environment, this in-memory Map
// will not work. You'd need a distributed cache like Redis or a database
// to track running processes. For a single-server setup, this is okay.
const runningRecorders = new Map<string, ffmpeg.FfmpegCommand>();


export async function POST(request: NextRequest) {
    try {
        const { cameraId } = await request.json();

        if (!cameraId) {
            return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
        }

        const command = runningRecorders.get(cameraId);

        if (!command) {
            // It's possible the process ended on its own.
            // We can check and update the DB status just in case.
            await updateCameraStatus(cameraId, 'online');
            return NextResponse.json({ message: 'Camera was not actively recording.' }, { status: 200 });
        }

        console.log(`Stopping recording for camera ${cameraId}...`);

        // fluent-ffmpeg doesn't have a direct 'stop' method that gracefully ends the stream.
        // We need to send a 'q' signal to the underlying ffmpeg process.
        // This is a common way to terminate ffmpeg.
        command.kill('SIGINT'); // or 'q' to stdin, but kill is more direct with fluent-ffmpeg.
        
        runningRecorders.delete(cameraId);
        await updateCameraStatus(cameraId, 'online');

        return NextResponse.json({ message: `Recording stopped for camera ${cameraId}` }, { status: 200 });

    } catch (error) {
        console.error('API Error stopping recording:', error);
        return NextResponse.json({ error: 'Failed to stop recording' }, { status: 500 });
    }
}
