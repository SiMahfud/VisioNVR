import { NextResponse } from 'next/server';
import { OnvifDevice } from 'node-onvif-ts';

// Main scanning function
async function scanForDevices(): Promise<any[]> {
    try {
        const devices = await OnvifDevice.discover({ timeout: 5000 }); // 5 second timeout
        
        const detailedDevices = await Promise.all(devices.map(async (device) => {
            try {
                // The library might require credentials for init, but we can try without them first
                // to get basic info.
                await device.init(); 

                return {
                    ip: device.address,
                    port: device.port,
                    information: device.getInformation(),
                    profiles: device.getProfiles(),
                };
            } catch (initError) {
                 console.error(`Failed to initialize or get details for device at ${device.address}:`, initError);
                // Return basic info if detailed info fails
                return {
                    ip: device.address,
                    port: device.port,
                    information: {
                        manufacturer: 'Unknown',
                        model: 'Unknown (init failed)',
                    },
                    profiles: [],
                };
            }
        }));

        console.log(`Scan complete. Found ${detailedDevices.length} cameras.`);
        return detailedDevices;
    } catch (error) {
        console.error('Error during ONVIF discovery:', error);
        throw error;
    }
}

// API Route Handler
export async function POST(request: Request) {
    try {
        // The user can optionally provide an IP range, but node-onvif-ts's discover
        // uses WS-Discovery which doesn't rely on IP ranges. We'll ignore the body
        // for now and use the library's discovery method.
        // const { ipRange } = await request.json(); // We can ignore this for now.

        console.log("Starting ONVIF network discovery...");
        const foundCameras = await scanForDevices();

        return NextResponse.json({ cameras: foundCameras }, { status: 200 });

    } catch (error: any) {
        console.error('API Route Error during ONVIF scan:', error);
        return NextResponse.json({ error: 'Failed to perform ONVIF scan', details: error.message }, { status: 500 });
    }
}
