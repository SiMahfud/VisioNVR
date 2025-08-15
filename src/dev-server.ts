import next from 'next';
import http from 'http';
import { startAllRecorders } from './lib/recorder';
import { exec } from 'child_process';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
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

    // 3. Start the Video Recorder Service
    // We start this after db-init to ensure it can fetch cameras
    if (!dev) { // Or based on some other condition
        console.log('Starting background recorder service...');
        startAllRecorders();
    } else {
        console.log('DEV mode: Recorder service starting (will restart on code change). For persistent recording, run in production mode.');
        startAllRecorders();
    }
    
    // 4. Create and Start the HTTP Server
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
