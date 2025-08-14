import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';

const mockCameras = [
  { id: 'cam-1', name: 'Lobby', status: 'online', ip: '192.168.1.101', location: 'Main Building', rtspUrl: 'rtsp://192.168.1.101:554/stream1', recordingMode: 'motion', username: 'user', password: 'password', enabled: true },
  { id: 'cam-2', name: 'Entrance', status: 'online', ip: '192.168.1.102', location: 'Main Building', rtspUrl: 'rtsp://192.168.1.102:554/stream1', recordingMode: 'continuous', username: 'user', password: 'password', enabled: true },
  { id: 'cam-3', name: 'Parking Lot', status: 'offline', ip: '192.168.1.103', location: 'Outdoor', rtspUrl: 'rtsp://192.168.1.103:554/stream1', recordingMode: 'scheduled', username: 'user', password: 'password', enabled: false },
  { id: 'cam-4', name: 'Warehouse', status: 'online', ip: '192.168.1.104', location: 'Building B', rtspUrl: 'rtsp://192.168.1.104:554/stream1', recordingMode: 'motion', username: 'user', password: 'password', enabled: true },
  { id: 'cam-5', name: 'Office 1', status: 'online', ip: '192.168.1.105', location: 'Main Building', rtspUrl: 'rtsp://192.168.1.105:554/stream1', recordingMode: 'continuous', username: 'user', password: 'password', enabled: true },
  { id: 'cam-6', name: 'Rooftop', status: 'online', ip: '192.168.1.106', location: 'Main Building', rtspUrl: 'rtsp://192.168.1.106:554/stream1', recordingMode: 'motion', username: 'user', password: 'password', enabled: true },
  { id: 'cam-7', name: 'Server Room', status: 'online', ip: '192.168.1.107', location: 'Basement', rtspUrl: 'rtsp://192.168.1.107:554/stream1', recordingMode: 'scheduled', username: 'user', password: 'password', enabled: false },
  { id: 'cam-8', name: 'Back Door', status: 'offline', ip: '192.168.1.108', location: 'Building B', rtspUrl: 'rtsp://192.168.1.108:554/stream1', recordingMode: 'motion', username: 'user', password: 'password', enabled: true },
];

const today = new Date();
const mockMotionEvents = Array.from({ length: 15 }).map((_, i) => {
    const startHour = Math.floor(Math.random() * 24);
    const startMinute = Math.floor(Math.random() * 60);
    const durationMinutes = Math.floor(Math.random() * 5) + 1;

    const startTime = new Date(today);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + durationMinutes);

    return {
        id: `evt-${i}`,
        cameraId: 'cam-1',
        startTime,
        endTime,
        thumbnail: `https://placehold.co/120x80.png`,
    };
}).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());


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

  await db.exec('PRAGMA foreign_keys = ON;');
  
  // Drop existing table to update schema - DEVELOPMENT ONLY
  // In production, you would use a migration system.
  // await db.exec('DROP TABLE IF EXISTS cameras');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      ip TEXT NOT NULL,
      location TEXT,
      rtspUrl TEXT,
      recordingMode TEXT DEFAULT 'motion',
      username TEXT,
      password TEXT,
      enabled BOOLEAN DEFAULT true
    );
  `);
  
  try {
     await db.exec('ALTER TABLE cameras ADD COLUMN rtspUrl TEXT');
     await db.exec("ALTER TABLE cameras ADD COLUMN recordingMode TEXT DEFAULT 'motion'");
     await db.exec('ALTER TABLE cameras ADD COLUMN username TEXT');
     await db.exec('ALTER TABLE cameras ADD COLUMN password TEXT');
     await db.exec('ALTER TABLE cameras ADD COLUMN enabled BOOLEAN DEFAULT true');
     console.log('Camera table schema updated.');
  } catch (e: any) {
    if (e.message.includes('duplicate column name')) {
        // console.log('Camera table schema already up to date.');
    } else {
        console.error('Error updating camera table schema:', e);
    }
  }


  await db.exec(`
    CREATE TABLE IF NOT EXISTS motion_events (
      id TEXT PRIMARY KEY,
      cameraId TEXT,
      startTime TEXT,
      endTime TEXT,
      thumbnail TEXT,
      FOREIGN KEY(cameraId) REFERENCES cameras(id) ON DELETE CASCADE
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

  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_zones (
        id TEXT PRIMARY KEY,
        cameraId TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        FOREIGN KEY(cameraId) REFERENCES cameras(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_rules (
        cameraId TEXT NOT NULL,
        type TEXT NOT NULL,
        enabled BOOLEAN NOT NULL,
        sensitivity INTEGER NOT NULL,
        PRIMARY KEY (cameraId, type),
        FOREIGN KEY(cameraId) REFERENCES cameras(id) ON DELETE CASCADE
    );
  `);

  // Check if tables are empty before seeding
  const cameraCount = await db.get('SELECT COUNT(*) as count FROM cameras');
  if (cameraCount.count === 0) {
    console.log('Seeding cameras...');
    const cameraStmt = await db.prepare('INSERT INTO cameras (id, name, status, ip, location, rtspUrl, recordingMode, username, password, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const camera of mockCameras) {
      await cameraStmt.run(camera.id, camera.name, camera.status, camera.ip, camera.location, camera.rtspUrl, camera.recordingMode, camera.username, camera.password, camera.enabled);
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

  const settingsCount = await db.get('SELECT COUNT(*) as count FROM app_settings');
    if (settingsCount.count === 0) {
        console.log('Seeding default app settings...');
        await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', 'highlightInterval', '3');
    }


  console.log('Database initialization complete.');

  await db.close();
}

initializeDB().catch(err => {
  console.error('Failed to initialize database:', err);
});
