export type Camera = {
  id: string;
  name: string;
  status: 'online' | 'offline';
  ip: string;
  location: string;
};

export const mockCameras: Camera[] = [
  { id: 'cam-1', name: 'Lobby', status: 'online', ip: '192.168.1.101', location: 'Main Building' },
  { id: 'cam-2', name: 'Entrance', status: 'online', ip: '192.168.1.102', location: 'Main Building' },
  { id: 'cam-3', name: 'Parking Lot', status: 'offline', ip: '192.168.1.103', location: 'Outdoor' },
  { id: 'cam-4', name: 'Warehouse', status: 'online', ip: '192.168.1.104', location: 'Building B' },
  { id: 'cam-5', name: 'Office 1', status: 'online', ip: '192.168.1.105', location: 'Main Building' },
  { id: 'cam-6', name: 'Rooftop', status: 'online', ip: '192.168.1.106', location: 'Main Building' },
  { id: 'cam-7', name: 'Server Room', status: 'online', ip: '192.168.1.107', location: 'Basement' },
  { id: 'cam-8', name: 'Back Door', status: 'offline', ip: '192.168.1.108', location: 'Building B' },
];

export type MotionEvent = {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime: Date;
  thumbnail: string;
};

// Generate some motion events for cam-1 for today
const today = new Date();
export const mockMotionEvents: MotionEvent[] = Array.from({ length: 15 }).map((_, i) => {
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
