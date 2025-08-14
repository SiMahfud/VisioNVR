import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { mockCameras, mockMotionEvents } from './data';
import fs from 'fs';

async function initializeDB() {
  const dbFile = './visionary.db';

  if (fs.existsSync(dbFile)) {
    console.log('Database already exists. Checking tables.');
  } else {
    console.log('Database not found, initializing...');
  }
  
  const db = await open({
    filename: dbFile,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT,
      ip TEXT,
      location TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS motion_events (
      id TEXT PRIMARY KEY,
      cameraId TEXT,
      startTime TEXT,
      endTime TEXT,
      thumbnail TEXT,
      FOREIGN KEY(cameraId) REFERENCES cameras(id)
    );
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT
    );
  `);

  // Check if tables are empty before seeding
  const cameraCount = await db.get('SELECT COUNT(*) as count FROM cameras');
  if (cameraCount.count === 0) {
    console.log('Seeding cameras...');
    const cameraStmt = await db.prepare('INSERT INTO cameras (id, name, status, ip, location) VALUES (?, ?, ?, ?, ?)');
    for (const camera of mockCameras) {
      await cameraStmt.run(camera.id, camera.name, camera.status, camera.ip, camera.location);
    }
    await cameraStmt.finalize();
  }

  const eventCount = await db.get('SELECT COUNT(*) as count FROM motion_events');
  if (eventCount.count === 0) {
    console.log('Seeding motion events...');
    const eventStmt = await db.prepare('INSERT INTO motion_events (id, cameraId, startTime, endTime, thumbnail) VALUES (?, ?, ?, ?, ?)');
    for (const event of mockMotionEvents) {
      await eventStmt.run(event.id, event.cameraId, event.startTime.toISOString(), event.endTime.toISOString(), event.thumbnail);
    }
    await eventStmt.finalize();
  }

  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Creating default admin user...');
    // In a real app, you should hash the password!
    await db.run('INSERT INTO users (username, password, name) VALUES (?, ?, ?)', 'admin', 'admin', 'Admin User');
  }

  console.log('Database initialization complete.');

  await db.close();
}

initializeDB().catch(err => {
  console.error('Failed to initialize database:', err);
});
