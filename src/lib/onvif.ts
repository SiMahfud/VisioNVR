// This file is currently not used directly by the frontend.
// The logic has been moved to the API route at /src/app/api/onvif-scan/route.ts
// This is because the 'node-onvif-ts' library and its dependencies (like 'net')
// are Node.js modules and cannot run directly in a 'use client' component
// or standard browser environment.

// By placing the logic in a Next.js API route, we ensure it runs on the server-side,
// where it has access to the necessary Node.js environment. The frontend can then
// simply call this API endpoint to trigger the scan.

// This file is kept for reference but can be safely removed if desired.

export {};
