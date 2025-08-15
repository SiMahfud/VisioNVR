import { NextResponse } from 'next/server';
import { OnvifDevice, startProbe } from 'node-onvif-ts'; // Import startProbe

// Main scanning function
async function scanForDevices(): Promise<any[]> {
    try {
        // Use startProbe for discovery
        const devices = await startProbe(); // 5 second timeout
        
        const detailedDevices = await Promise.all(devices.map(async (deviceInfo) => { // Renamed to deviceInfo
           try {
               // Create an OnvifDevice instance for each found device
               const device = new OnvifDevice({
                   xaddr: deviceInfo.xaddrs[0], // Use the xaddr from the discovery result
                   user: 'admin',
                   pass: 'smart999',
               });

               // The library might require credentials for init, but we can try without them first
               // to get basic info.
               await device.init();

               return {
                   ip: device.address,
                   information: device.getInformation(),
                   profiles: device.getCurrentProfile(),
               };
           } catch (initError) {
                console.error(`Failed to initialize or get details for device at ${deviceInfo.xaddrs[0]}:`, initError); // Use deviceInfo.xaddrs[0]
               // Return basic info if detailed info fails
               return {
                   ip: deviceInfo.xaddrs[0].split('/')[2].split(':')[0], // Extract IP from xaddr
                   port: parseInt(deviceInfo.xaddrs[0].split(':')[2].split('/')[0]), // Extract port from xaddr
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
        const { ipRange } = await request.json();

        console.log("Starting ONVIF network discovery...");
        const foundCameras = await scanForDevices();

        return NextResponse.json({ cameras: foundCameras }, { status: 200 });
    } catch (error) {
        console.error('API Route Error during ONVIF scan:', error);
        return NextResponse.json({ error: 'Failed to scan for ONVIF devices' }, { status: 500 });
    }
}
