import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { mockCameras, mockMotionEvents } from './data';
import fs from 'fs';

async function initializeDB() {
  const dbFile = './visionary.db';

  if (fs.existsSync(dbFile)) {
    console.log('Database already exists. Skipping initialization.');
    return;
  }

  console.log('Database not found, initializing...');
  const db = await open({
    filename: dbFile,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE cameras (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT,
      ip TEXT,
      location TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE motion_events (
      id TEXT PRIMARY KEY,
      cameraId TEXT,
      startTime TEXT,
      endTime TEXT,
      thumbnail TEXT,
      FOREIGN KEY(cameraId) REFERENCES cameras(id)
    );
  `);

  const cameraStmt = await db.prepare('INSERT INTO cameras (id, name, status, ip, location) VALUES (?, ?, ?, ?, ?)');
  for (const camera of mockCameras) {
    await cameraStmt.run(camera.id, camera.name, camera.status, camera.ip, camera.location);
  }
  await cameraStmt.finalize();

  const eventStmt = await db.prepare('INSERT INTO motion_events (id, cameraId, startTime, endTime, thumbnail) VALUES (?, ?, ?, ?, ?)');
  for (const event of mockMotionEvents) {
    await eventStmt.run(event.id, event.cameraId, event.startTime.toISOString(), event.endTime.toISOString(), event.thumbnail);
  }
  await eventStmt.finalize();

  console.log('Database initialized with mock data.');

  await db.close();
}

initializeDB().catch(err => {
  console.error('Failed to initialize database:', err);
});
