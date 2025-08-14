'use server';

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

export type Camera = {
  id: string;
  name: string;
  status: 'online' | 'offline';
  ip: string;
  location: string;
  rtspUrl: string | null;
  recordingMode: 'continuous' | 'scheduled' | 'motion';
  username: string | null;
  password?: string | null;
  enabled: boolean;
};

export type User = {
    id: number;
    username: string;
    password?: string; // Password should only be used for updates, not sent to client
    name: string;
}

export type MotionEvent = {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime: Date;
  thumbnail: string;
};

export type AnalyticsZone = {
    id: string;
    cameraId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type AnalyticsRule = {
    cameraId: string;
    type: string;
    enabled: boolean;
    sensitivity: number;
}

async function getDb() {
  const db = await open({
    filename: './visionary.db',
    driver: sqlite3.Database,
  });
  // Enable foreign key support
  await db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

// Camera Functions
export async function getCameras(): Promise<Camera[]> {
  const db = await getDb();
  const cameras = await db.all('SELECT * FROM cameras ORDER BY name');
  return cameras.map(c => ({...c, enabled: !!c.enabled})) as Camera[];
}

export async function addCamera(camera: Omit<Camera, 'id' | 'status' | 'enabled'>): Promise<void> {
    const db = await getDb();
    await db.run(
        'INSERT INTO cameras (id, name, ip, location, status, rtspUrl, recordingMode, username, password, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        `cam-${Date.now()}`,
        camera.name,
        camera.ip,
        camera.location,
        'offline', // New cameras are offline by default
        camera.rtspUrl,
        camera.recordingMode,
        camera.username,
        camera.password,
        true
    );
}

export async function updateCamera(camera: Omit<Camera, 'status'>): Promise<void> {
    const db = await getDb();
    if(camera.password) {
        await db.run(
            'UPDATE cameras SET name = ?, ip = ?, location = ?, rtspUrl = ?, recordingMode = ?, username = ?, password = ?, enabled = ? WHERE id = ?',
            camera.name,
            camera.ip,
            camera.location,
            camera.rtspUrl,
            camera.recordingMode,
            camera.username,
            camera.password,
            camera.enabled,
            camera.id
        );
    } else {
        await db.run(
            'UPDATE cameras SET name = ?, ip = ?, location = ?, rtspUrl = ?, recordingMode = ?, username = ?, enabled = ? WHERE id = ?',
            camera.name,
            camera.ip,
            camera.location,
            camera.rtspUrl,
            camera.recordingMode,
            camera.username,
            camera.enabled,
            camera.id
        );
    }
}

export async function deleteCamera(id: string): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM cameras WHERE id = ?', id);
}

// Motion Event Functions
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

// User & Auth Functions
export async function verifyUser(username: string, password_sent: string): Promise<User | null> {
    const db = await getDb();
    const user = await db.get<User>('SELECT id, username, password, name FROM users WHERE username = ?', username);

    if (!user || user.password !== password_sent) {
        return null;
    }
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

export async function updateUser(user: User): Promise<void> {
    const db = await getDb();
    if (user.password) {
        await db.run(
            'UPDATE users SET name = ?, username = ?, password = ? WHERE id = ?',
            user.name, user.username, user.password, user.id
        );
    } else {
        await db.run(
            'UPDATE users SET name = ?, username = ? WHERE id = ?',
            user.name, user.username, user.id
        );
    }
}

// App Settings
export async function getAppSetting(key: string): Promise<string | null> {
    const db = await getDb();
    const setting = await db.get('SELECT value FROM app_settings WHERE key = ?', key);
    return setting?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
    const db = await getDb();
    await db.run(
        'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key, value
    );
}

// Analytics Functions
export async function getAnalyticsConfig(cameraId: string): Promise<{ zones: AnalyticsZone[], rules: AnalyticsRule[] }> {
    const db = await getDb();
    const zones = await db.all('SELECT * FROM analytics_zones WHERE cameraId = ?', cameraId);
    const rules = await db.all('SELECT * FROM analytics_rules WHERE cameraId = ?', cameraId);
    return {
        zones: zones.map(z => ({...z, x: Number(z.x), y: Number(z.y), width: Number(z.width), height: Number(z.height)})) as AnalyticsZone[],
        rules: rules.map(r => ({...r, enabled: !!r.enabled, sensitivity: Number(r.sensitivity)})) as AnalyticsRule[]
    };
}

export async function saveAnalyticsConfig(cameraId: string, zones: Omit<AnalyticsZone, 'cameraId'>[], rules: Omit<AnalyticsRule, 'cameraId'>[]): Promise<void> {
    const db = await getDb();
    
    await db.run('BEGIN TRANSACTION');
    try {
        // Clear old config for this camera
        await db.run('DELETE FROM analytics_zones WHERE cameraId = ?', cameraId);
        await db.run('DELETE FROM analytics_rules WHERE cameraId = ?', cameraId);

        // Insert new zones
        const zoneStmt = await db.prepare('INSERT INTO analytics_zones (id, cameraId, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)');
        for (const zone of zones) {
            await zoneStmt.run(zone.id, cameraId, zone.x, zone.y, zone.width, zone.height);
        }
        await zoneStmt.finalize();

        // Insert new rules
        const ruleStmt = await db.prepare('INSERT INTO analytics_rules (cameraId, type, enabled, sensitivity) VALUES (?, ?, ?, ?)');
        for (const rule of rules) {
            await ruleStmt.run(cameraId, rule.type, rule.enabled, rule.sensitivity);
        }
        await ruleStmt.finalize();

        await db.run('COMMIT');
    } catch (err) {
        await db.run('ROLLBACK');
        throw err; // Re-throw the error after rolling back
    }
}
