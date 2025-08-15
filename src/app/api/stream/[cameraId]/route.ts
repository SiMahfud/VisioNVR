// This file is now deprecated and will be replaced by the /api/stream/start route.
// Keeping it avoids breaking references, but it should do nothing.
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { cameraId: string } }
) {
  // Deprecated: The logic is now handled by /api/stream/start and the WebSocket server.
  return NextResponse.json({ message: 'This endpoint is deprecated. Use /api/stream/start.' }, { status: 410 });
}
