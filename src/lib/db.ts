'use server';

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Camera, MotionEvent, User } from './data';

async function getDb() {
  const db = await open({
    filename: './visionary.db',
    driver: sqlite3.Database,
  });
  return db;
}

export async function getCameras(): Promise<Camera[]> {
  const db = await getDb();
  const cameras = await db.all('SELECT * FROM cameras');
  return cameras as Camera[];
}

export async function addCamera(camera: Omit<Camera, 'id' | 'status'>) {
    const db = await getDb();
    const result = await db.run(
        'INSERT INTO cameras (id, name, ip, location, status) VALUES (?, ?, ?, ?, ?)',
        `cam-${Date.now()}`,
        camera.name,
        camera.ip,
        camera.location,
        'offline'
    );
    return result;
}


export async function getMotionEvents(cameraId: string, date: Date): Promise<MotionEvent[]> {
    const db = await getDb();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await db.all(
        'SELECT * FROM motion_events WHERE cameraId = ? AND startTime >= ? AND startTime <= ? ORDER BY startTime ASC',
        cameraId,
        startOfDay.toISOString(),
        endOfDay.toISOString()
    );
    
    return events.map(event => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
    })) as MotionEvent[];
}

export async function verifyUser(username: string, password_sent: string): Promise<User | null> {
    const db = await getDb();
    // Select all necessary user fields but exclude password from the final result
    const user = await db.get<User>('SELECT id, username, password, name FROM users WHERE username = ?', username);

    if (!user || user.password !== password_sent) {
        return null;
    }
    
    // Don't send password to client
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}
