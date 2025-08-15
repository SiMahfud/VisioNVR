
import { NextRequest, NextResponse } from 'next/server';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';

const HLS_OUTPUT_DIR = path.join(process.cwd(), 'public', 'hls');

// Pastikan direktori output HLS ada
if (!fs.existsSync(HLS_OUTPUT_DIR)) {
  fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
}

// Penyimpanan dalam memori untuk melacak proses ffmpeg yang berjalan
const runningProcesses = new Map<string, ChildProcessWithoutNullStreams>();

// Fungsi untuk menunggu file ada, dengan timeout
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

export async function GET(
  request: NextRequest,
  { params }: { params: { cameraId: string } }
) {
  const { cameraId } = params;

  let rtspUrl = '';
  try {
    // URL RTSP di-encode dalam parameter cameraId dari klien
    // Menggunakan Buffer.from untuk mendekode base64 di lingkungan Node.js
    rtspUrl = Buffer.from(cameraId, 'base64').toString('utf8');
  } catch (err) {
    console.error(`Error decoding cameraId: ${cameraId}`, err);
    return new NextResponse('Invalid camera ID encoding', { status: 400 });
  }

  if (!rtspUrl.startsWith('rtsp://')) {
    return new NextResponse(`Invalid RTSP URL: ${rtspUrl}`, { status: 400 });
  }

  const streamOutputDir = path.join(HLS_OUTPUT_DIR, cameraId);
  const m3u8File = path.join(streamOutputDir, 'stream.m3u8');

  // Jika proses sudah berjalan untuk ID ini, langsung gunakan kembali
  if (!runningProcesses.has(cameraId)) {
    console.log(`[ffmpeg] Starting new process for ${rtspUrl}`);
    
    // Pastikan direktori stream bersih sebelum memulai
    if (fs.existsSync(streamOutputDir)) {
        fs.rmSync(streamOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(streamOutputDir, { recursive: true });

    // Perubahan krusial: Hapus '-c:v copy' untuk memaksa transkode.
    // Ini lebih andal meskipun membutuhkan lebih banyak CPU.
    const commandArgs = [
        '-rtsp_transport', 'tcp',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-i', rtspUrl,
        '-an', // No audio
        '-c:v', 'copy', // DIKEMBALIKAN: Sesuai referensi, lebih efisien.
        '-f', 'hls',
        '-hls_time', '2', // Durasi segmen HLS (detik)
        '-hls_list_size', '3', // Jumlah segmen dalam playlist
        '-hls_flags', 'delete_segments+program_date_time', // Hapus segmen lama
        '-hls_segment_filename', path.join(streamOutputDir, 'segment_%03d.ts'),
        m3u8File
    ];

    const ffmpegProcess = spawn('ffmpeg', commandArgs, { detached: false });
    runningProcesses.set(cameraId, ffmpegProcess);

    ffmpegProcess.stderr.on('data', (data) => {
        // Log untuk debugging, bisa dikurangi jika sudah stabil
        console.log(`[ffmpeg stderr] ${cameraId}: ${data.toString().trim()}`);
    });

    ffmpegProcess.on('error', (err) => {
        console.error(`[ffmpeg error] Failed to start process for ${cameraId}:`, err);
        runningProcesses.delete(cameraId);
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`[ffmpeg close] Process for ${cameraId} exited with code ${code}`);
        runningProcesses.delete(cameraId);
        // Hapus direktori stream saat proses berhenti untuk membersihkan segmen
        if (fs.existsSync(streamOutputDir)) {
            fs.rmSync(streamOutputDir, { recursive: true, force: true });
        }
    });
  }

  // Tunggu hingga file m3u8 dibuat oleh ffmpeg
  const fileExists = await waitForFile(m3u8File, 15000); // Timeout lebih lama
  if (!fileExists) {
    console.error(`[ffmpeg] Timeout waiting for m3u8 file: ${m3u8File}`);
    // Berhenti mencoba memulai ulang jika gagal setelah timeout
    const process = runningProcesses.get(cameraId);
    if(process) {
        process.kill();
        runningProcesses.delete(cameraId);
    }
    return new NextResponse('Stream could not be started in time.', { status: 504 }); // 504 Gateway Timeout
  }

  // Alih-alih menyajikan file m3u8, kita akan mengarahkan klien ke sana.
  // Namun, pendekatan yang lebih baik adalah klien sudah tahu URL-nya.
  // Di sini kita hanya akan mengembalikan status OK untuk mengonfirmasi stream sudah siap.
  // Klien sekarang bertanggung jawab untuk meminta /hls/{cameraId}/stream.m3u8
  
  const playlistContent = fs.readFileSync(m3u8File, 'utf-8');
  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.apple.mpegurl');
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  return new NextResponse(playlistContent, {
    status: 200,
    headers: headers,
  });
}
