
import { NextResponse } from 'next/server';
import { startStreamForCamera } from '@/lib/recorder';

export async function POST(request: Request) {
    try {
        const { cameraId } = await request.json() as { cameraId: string };

        if (!cameraId) {
            return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
        }

        const success = await startStreamForCamera(cameraId);

        if (success) {
            return NextResponse.json({ message: `Stream started for ${cameraId}` }, { status: 200 });
        } else {
            return NextResponse.json({ error: `Failed to start stream for ${cameraId}` }, { status: 500 });
        }
    } catch (error) {
        console.error("API Route Error starting stream:", error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
