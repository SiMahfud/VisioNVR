import { NextResponse } from 'next/server';
import * as net from 'net';
import { OnvifDevice } from 'node-onvif-ts';

// Helper function to parse IP range (e.g., "192.168.1.1-192.168.1.254" or "192.168.1.10")
function parseIpRange(ipRange: string): string[] {
    const ips: string[] = [];
    const rangeParts = ipRange.split('-');

    if (rangeParts.length === 2) {
        const startIp = rangeParts[0];
        const endIp = rangeParts[1];

        const startParts = startIp.split('.').map(Number);
        const endParts = endIp.split('.').map(Number);

        if (startParts.length === 4 && endParts.length === 4) {
            // Simple handling for ranges within the last octet
            if (startParts.slice(0, 3).join('.') === endParts.slice(0, 3).join('.') && startParts[3] <= endParts[3]) {
                const base = startParts.slice(0, 3).join('.');
                for (let i = startParts[3]; i <= endParts[3]; i++) {
                    ips.push(`${base}.${i}`);
                }
            } else {
                console.error("Only simple IP range parsing within the last octet is supported (e.g., 192.168.1.10-192.168.1.20)");
            }
        } else {
             console.error("Invalid IP address format in range.");
        }
    } else {
        // Assume a single IP
        const ipParts = ipRange.split('.').map(Number);
        if (ipParts.length === 4 && ipParts.every(part => part >= 0 && part <= 255)) {
             ips.push(ipRange);
        } else {
             console.error(`Invalid single IP address format: ${ipRange}`);
        }
    }

    return ips;
}

// Helper function to check if a TCP port is open
async function checkPortOpen(host: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            resolve(false);
        });
        socket.connect(port, host);
    });
}


// Main scanning function (adapted for server-side use)
async function scanOnvifCameras(ipRange: string): Promise<any[]> {
    const camerasFound: any[] = [];
    const ipsToScan = parseIpRange(ipRange);
    const onvifPorts = [80, 443, 5800]; // Common ONVIF ports
    const timeout = 2000; // Timeout for connection attempts in ms

    console.log(`Starting ONVIF scan for IP range: ${ipRange}`);

    for (const ip of ipsToScan) {
        for (const port of onvifPorts) {
            const isPortOpen = await checkPortOpen(ip, port, timeout);
            if (isPortOpen) {
                console.log(`Port ${port} is open on ${ip}. Attempting ONVIF probe.`);
                try {
                    const device = new OnvifDevice({
                        xaddr: `http://${ip}:${port}/onvif/device_service`,
                        // Uncomment and replace with actual credentials if needed
                        // user: 'your_username',
                        // pass: 'your_password'
                    });

                    const deviceInfo = await device.init();

                    console.log('Found ONVIF device:', deviceInfo);
                    camerasFound.push({
                        ip: ip,
                        port: port,
                        information: deviceInfo
                    });
                    // If we found a device on this IP, no need to check other ports for this IP
                    break;
                } catch (error: any) {
                    // console.error(`ONVIF probe failed for ${ip}:${port}`, error.message);
                    // Log error for debugging if needed
                }
            }
        }
    }

    console.log(`Scan complete. Found ${camerasFound.length} cameras.`);
    return camerasFound;
}

// API Route Handler
export async function POST(request: Request) {
    try {
        const { ipRange } = await request.json();

        if (!ipRange || typeof ipRange !== 'string') {
            return NextResponse.json({ error: 'Invalid IP range provided' }, { status: 400 });
        }

        const foundCameras = await scanOnvifCameras(ipRange);

        return NextResponse.json({ cameras: foundCameras }, { status: 200 });

    } catch (error: any) {
        console.error('API Route Error during ONVIF scan:', error);
        return NextResponse.json({ error: 'Failed to perform ONVIF scan', details: error.message }, { status: 500 });
    }
}

// You could also add a GET handler if you prefer sending IP range via query parameters
// export async function GET(request: Request) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const ipRange = searchParams.get('ipRange');
//
//         if (!ipRange || typeof ipRange !== 'string') {
//             return NextResponse.json({ error: 'Invalid IP range provided' }, { status: 400 });
//         }
//
//         const foundCameras = await scanOnvifCameras(ipRange);
//
//         return NextResponse.json({ cameras: foundCameras }, { status: 200 });
//
//     } catch (error: any) {
//         console.error('API Route Error during ONVIF scan:', error);
//         return NextResponse.json({ error: 'Failed to perform ONVIF scan', details: error.message }, { status: 500 });
//     }
// }