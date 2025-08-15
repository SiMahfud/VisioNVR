
'use client';

import { useEffect, useRef } from 'react';

// Define JSMpeg type definitions locally if @types/jsmpeg is not available
declare const JSMpeg: any;

export function VideoPlayer({ src: cameraId }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!cameraId) return;

    // Load JSMPEG script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/phoboslab/jsmpeg@master/jsmpeg.min.js';
    script.onload = async () => {
      // 1. First, call our API to ensure the ffmpeg process for this camera is running.
      try {
        const response = await fetch(`/api/stream/start`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cameraId })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to start stream process for ${cameraId}: ${errorText}`);
            return;
        }
      } catch (error) {
         console.error(`Error calling start stream API for ${cameraId}:`, error);
         return;
      }

      // 2. The ffmpeg process is running, now connect JSMPEG via WebSocket.
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Clean up previous player instance if it exists
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn("Could not destroy previous JSMpeg player:", e);
        }
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws-stream/${cameraId}`;
      
      console.log(`[JSMPEG] Connecting to WebSocket: ${wsUrl}`);
      
      try {
        playerRef.current = new JSMpeg.Player(wsUrl, {
          canvas: canvas,
          autoplay: true,
          audio: false,
          disableGl: true, // Recommended for wider compatibility
        });
      } catch(e) {
        console.error("[JSMPEG] Error creating player:", e);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup on component unmount
      if (playerRef.current) {
         try {
           playerRef.current.destroy();
         } catch(e) {
            console.warn("Could not destroy JSMpeg player on unmount:", e);
         }
      }
      document.head.removeChild(script);
    };
  }, [cameraId]);

  return <canvas ref={canvasRef} className="w-full h-full object-cover bg-black" />;
}
