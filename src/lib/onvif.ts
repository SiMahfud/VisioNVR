import * as net from 'net';
import { OnvifDevice } from 'node-onvif-ts';

export async function scanOnvifCameras(ipRange: string): Promise<any[]> {
  const camerasFound: any[] = [];
  const ipsToScan = parseIpRange(ipRange);

  console.log(`Starting ONVIF scan for IP range: ${ipRange}`);
  // Common ONVIF ports to check
  const onvifPorts = [80, 443, 5800]; // Common ONVIF ports
  const timeout = 2000; // Timeout for connection attempts in ms

  for (const ip of ipsToScan) {
    for (const port of onvifPorts) {
      const isPortOpen = await checkPortOpen(ip, port, timeout);
      if (isPortOpen) {
        console.log(`Port ${port} is open on ${ip}. Attempting ONVIF probe.`);
        try {
          const device = new OnvifDevice({
            xaddr: `http://${ip}:${port}/onvif/device_service`,
                // user: 'your_username',
                // pass: 'your_password'
          });
          // Initialize the OnvifDevice object and get information
          const deviceInfo = await device.init();
          await device.init();
          console.log('Found ONVIF device:', device.getInformation);
          camerasFound.push({
            ip: ip,
            port: port,
            information: device.getInformation
          });
          // If we found a device on this IP, no need to check other ports for this IP
          break;
        } catch (error: any) {
          // console.error(`ONVIF probe failed for ${ip}:${port}`, error.message);
        }
      }
    }
  }

  console.log(`Scan complete. Found ${camerasFound.length} cameras.`);
  return camerasFound;
}

// Helper function to parse IP range (e.g., "192.168.1.1-192.168.1.254" or "192.168.1.10")
function parseIpRange(ipRange: string): string[] {
    const ips: string[] = [];
    const rangeParts = ipRange.split('-');

    if (rangeParts.length === 2) {
        const startIp = rangeParts[0];
        const endIp = rangeParts[1];

        const startParts = startIp.split('.').map(Number);
        const endParts = endIp.split('.').map(Number); // Corrected split here

        if (startParts.length === 4 && endParts.length === 4 && startParts.every(part => !isNaN(part)) && endParts.every(part => !isNaN(part))) {
            if (startParts.slice(0, 3).join('.') === endParts.slice(0, 3).join('.') && startParts[3] <= endParts[3]) {
                const base = startParts.slice(0, 3).join('.');
                for (let i = startParts[3]; i <= endParts[3]; i++) {
                    ips.push(`${base}.${i}`);
                }
            } else {
                console.error(`Only simple IP range parsing within the last octet is supported: ${ipRange}`);
            }
        } else {
             console.error("Invalid IP address format in range.");
        }
    } else { // This is the block for single IP cases
        const ipParts = ipRange.split('.').map(Number);
        if (ipParts.length === 4 && ipParts.every(part => !isNaN(part) && part >= 0 && part <= 255)) {
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