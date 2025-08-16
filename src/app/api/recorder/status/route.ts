import { NextResponse } from 'next/server';
import { getRecorderStatus } from '@/lib/recorder';

export async function GET() {
  try {
    const status = await getRecorderStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get recorder status:', error);
    return NextResponse.json({ error: 'Failed to get recorder status' }, { status: 500 });
  }
}
