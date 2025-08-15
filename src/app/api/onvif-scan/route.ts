import { NextResponse } from 'next/server';
import { OnvifDevice } from 'node-onvif-ts'; // Import startProbe is no longer needed

// Helper function to parse IP range string into an array of IP addresses
function parseIpRange(ipRange: string): string[] {
    const ipAddresses: string[] = [];

    // Handle single IP address
    if (!ipRange.includes('-') && !ipRange.includes('/')) {
        // Basic validation for single IP format (you might want more robust validation)
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ipRange)) {
            ipAddresses.push(ipRange);
        } else {
            console.error(`Invalid single IP address format: ${ipRange}`);
        }
        return ipAddresses;
    }

    // Handle IP range (e.g., "192.168.1.10-192.168.1.20" or "192.168.1.10-20")
    if (ipRange.includes('-')) {
        const [start, end] = ipRange.split('-');
        const startParts = start.split('.').map(num => parseInt(num, 10));
        const endPartsRaw = end.split('.').map(num => parseInt(num, 10));

        // Jika end hanya 1 octet terakhir (e.g., "192.168.1.10-20")
        if (endPartsRaw.length === 1 && startParts.length === 4) {
            const [o1, o2, o3] = startParts.slice(0, 3);
            const startLastOctet = startParts[3];
            const endLastOctet = endPartsRaw[0];

            if (
                startLastOctet >= 0 && startLastOctet <= 255 &&
                endLastOctet >= 0 && endLastOctet <= 255 &&
                startLastOctet <= endLastOctet
            ) {
                for (let i = startLastOctet; i <= endLastOctet; i++) {
                    ipAddresses.push(`${o1}.${o2}.${o3}.${i}`);
                }
            } else {
                console.error(`Invalid IP range format: ${ipRange}`);
            }

        } else if (startParts.length === 4 && endPartsRaw.length === 4) {
            // Handle full IP range (basic implementation)
            if (startParts[0] === endPartsRaw[0] && startParts[1] === endPartsRaw[1] && startParts[2] === endPartsRaw[2]) {
                const [o1, o2, o3] = startParts.slice(0, 3);
                const startLastOctet = startParts[3];
                const endLastOctet = endPartsRaw[3];

                if (
                    startLastOctet >= 0 && startLastOctet <= 255 &&
                    endLastOctet >= 0 && endLastOctet <= 255 &&
                    startLastOctet <= endLastOctet
                ) {
                    for (let i = startLastOctet; i <= endLastOctet; i++) {
                        ipAddresses.push(`${o1}.${o2}.${o3}.${i}`);
                    }
                } else {
                    console.error(`Invalid IP range format: ${ipRange}`);
                }
            } else {
                console.error(`IP range across different subnets not supported: ${ipRange}`);
            }
        } else {
            console.error(`Invalid IP range format: ${ipRange}`);
        }
        return ipAddresses;
    }

    // Handle CIDR notation (e.g., "192.168.1.0/24") - Basic implementation
    if (ipRange.includes('/')) {
        try {
            const [ip, cidr] = ipRange.split('/');
            const ipParts = ip.split('.').map(Number);
            const cidrNum = parseInt(cidr, 10);

            if (ipParts.length === 4 && cidrNum >= 0 && cidrNum <= 32) {
                 // Calculate the network address
                 const networkAddress = ipParts.map(part => part >>> 0); // Convert to unsigned 32-bit integer
                 const networkMask = (~0) << (32 - cidrNum);

                 // Calculate the first and last usable IP addresses
                 const firstUsableIp = (networkAddress[0] << 24 | networkAddress[1] << 16 | networkAddress[2] << 8 | networkAddress[3]) & networkMask;
                 const lastUsableIp = firstUsableIp | (~networkMask >>> 0); // Use unsigned right shift

                 // Iterate through the IP addresses in the range
                 for (let i = firstUsableIp; i <= lastUsableIp; i++) {
                     // Exclude network and broadcast addresses for CIDR /24 or smaller
                     if (cidrNum < 32 && (i === firstUsableIp || i === lastUsableIp)) {
                         continue;
                     }
                     ipAddresses.push(`${(i >>> 24) & 0xFF}.${(i >>> 16) & 0xFF}.${(i >>> 8) & 0xFF}.${i & 0xFF}`);
                 }
            } else {
                 console.error(`Invalid CIDR format: ${ipRange}`);
            }
        } catch (error) {
            console.error(`Error parsing CIDR range ${ipRange}:`, error);
        }
        return ipAddresses;
    }


    console.error(`Unsupported IP range format: ${ipRange}`);
    return ipAddresses;
}


// Main scanning function
async function scanForDevices(ipAddresses: string[]): Promise<any[]> {
    const ONVIF_PORT = 80; // ONVIF default port

    // Create an array of promises, each representing the initialization of a device
    const devicePromises = ipAddresses.map(async (ip) => {
        try {
            console.log(`Attempting to connect to ONVIF device at ${ip}:${ONVIF_PORT}`);
            const device = new OnvifDevice({
                xaddr: `http://${ip}:${ONVIF_PORT}/onvif/device_service`,
                user: 'admin',
                pass: 'smart999',
            });

            // Initialize the OnvifDevice object
            await device.init();
            console.log(`Successfully initialized device at ${ip}`);

            // Return device information if initialization is successful
            return {
                ip: device.address,
                information: device.getInformation(),
                profiles: device.getCurrentProfile(),
            };

        } catch (initError) {
            // Ignore devices that fail to initialize and return null or undefined
            console.error(`Failed to initialize device at ${ip}:${ONVIF_PORT}:`, initError);
            return null; // Return null for failed initializations
        }
    });

    // Wait for all promises to settle
    const results = await Promise.all(devicePromises);

    // Filter out the null results (failed initializations)
    const foundCameras = results.filter(deviceInfo => deviceInfo !== null);

    console.log(`Scan complete. Found ${foundCameras.length} cameras.`);
    return foundCameras;
}

// API Route Handler
export async function POST(request: Request) {
    try {
        const { ipRange } = await request.json() as { ipRange: string }; // Expecting a string

        if (!ipRange) {
            return NextResponse.json({ error: 'IP range is required' }, { status: 400 });
        }

        console.log(`Received request to scan IP range: ${ipRange}`);
        const ipAddressesToScan = parseIpRange(ipRange);

        if (ipAddressesToScan.length === 0) {
             return NextResponse.json({ error: 'No valid IP addresses found in the provided range' }, { status: 400 });
        }

        console.log(`Scanning ${ipAddressesToScan.length} IP addresses...`);
        const foundCameras = await scanForDevices(ipAddressesToScan);

        return NextResponse.json({ cameras: foundCameras }, { status: 200 });
    } catch (error) {
        console.error('API Route Error during ONVIF scan:', error);
        return NextResponse.json({ error: 'Failed to scan for ONVIF devices' }, { status: 500 });
    }
}
