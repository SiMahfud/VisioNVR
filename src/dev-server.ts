
import next from 'next';
import http from 'http';
import { startAllRecorders, stopStreamForCamera, webSocketStreams } from './lib/recorder';
import { exec } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import type { ChildProcessWithoutNullStreams } from 'child_process';

// Declare global type for the setup function
declare global {
  var setupStreamBroadcast: ((cameraId: string, ffmpegProcess: ChildProcessWithoutNullStreams) => void) | undefined;
}
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev: true });
const handle = app.getRequestHandler();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 9002;

// Initialize the database first.
function initDb() {
  return new Promise<void>((resolve, reject) => {
    console.log('Initializing database...');
    const dbInitProcess = exec('npm run db:init');

    dbInitProcess.stdout?.on('data', (data) => {
      console.log(`[db-init stdout]: ${data}`);
    });

    dbInitProcess.stderr?.on('data', (data) => {
      console.error(`[db-init stderr]: ${data}`);
    });

    dbInitProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Database initialization complete.');
        resolve();
      } else {
        reject(new Error(`Database initialization failed with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    // 1. Initialize the Database
    await initDb();

    // 2. Prepare the Next.js App
    await app.prepare();
    console.log('Next.js app prepared.');

    // 3. Start the Video Recorder Service (for continuous background recording)
    if (!dev) {
      console.log('Starting background recorder service...');
      startAllRecorders();
    } else {
      console.log('DEV mode: Recorder service starting. Will restart on code change.');
      startAllRecorders();
    }
    
    // 4. Create the HTTP Server
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    // 5. Setup WebSocket Server
    const wss = new WebSocketServer({ noServer: true });

    // Map to hold clients for each camera stream
    // Key: cameraId, Value: Set of WebSocket clients
    const streamClients = new Map<string, Set<WebSocket>>();

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const parts = url.pathname.split('/');
        const cameraId = parts[parts.length - 1];

        if (!cameraId) {
            console.error('[WebSocket] Connection failed: No camera ID provided.');
            ws.close();
            return;
        }

        console.log(`[WebSocket] Client connected for camera: ${cameraId}`);

        // Add client to the set for this camera stream
        if (!streamClients.has(cameraId)) {
            streamClients.set(cameraId, new Set());
        }
        streamClients.get(cameraId)!.add(ws);

        ws.on('close', () => {
            console.log(`[WebSocket] Client disconnected from camera: ${cameraId}`);
            const clients = streamClients.get(cameraId);
            if (clients) {
                clients.delete(ws);
                // If no clients are left, stop the ffmpeg process to save resources
                if (clients.size === 0) {
                    console.log(`[WebSocket] No clients left for ${cameraId}. Stopping stream.`);
                    stopStreamForCamera(cameraId);
                    streamClients.delete(cameraId);
                }
            }
        });

        ws.on('error', (error) => {
            console.error(`[WebSocket] Error for client on camera ${cameraId}:`, error);
        });
    });

    // Handle WebSocket upgrade requests
    server.on('upgrade', (request, socket, head) => {
        const pathname = request.url;
        if (pathname && pathname.startsWith('/ws-stream/')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    // Function to setup FFmpeg data broadcasting for a camera
    function setupStreamBroadcast(cameraId: string, ffmpegProcess: ChildProcessWithoutNullStreams) {
        ffmpegProcess.stdout.on('data', (chunk) => {
            const clients = streamClients.get(cameraId);
            if (clients && clients.size > 0) {
                for (const client of clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(chunk);
                    }
                }
            }
        });

        ffmpegProcess.stderr.on('data', (data) => {
            console.error(`[FFmpeg ${cameraId}] stderr: ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`[FFmpeg ${cameraId}] Process closed with code ${code}`);
            webSocketStreams.delete(cameraId);
        });
    }

    // Export the setup function for use in recorder.ts
    global.setupStreamBroadcast = setupStreamBroadcast;

    // 6. Start the Server
    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
