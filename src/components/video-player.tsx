
'use client';

import { useEffect, useRef } from 'react';

// Define JSMpeg type definitions locally if @types/jsmpeg is not available
declare const JSMpeg: any;

export function VideoPlayer({ src: cameraId, rtspUrl }: { src?: string; rtspUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!cameraId && !rtspUrl) return;

    // Load JSMPEG script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/phoboslab/jsmpeg@master/jsmpeg.min.js';
    script.onload = async () => {
      let streamId: string;
      
      if (rtspUrl) {
        // For RTSP URL preview (scanned cameras)
        try {
          const response = await fetch(`/api/stream/preview`, { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rtspUrl })
          });
          if (!response.ok) {
              const errorText = await response.text();
              console.error(`Failed to start preview stream for RTSP URL: ${errorText}`);
              return;
          }
          const data = await response.json();
          streamId = data.previewId;
        } catch (error) {
           console.error(`Error calling preview stream API:`, error);
           return;
        }
      } else if (cameraId) {
        // For saved cameras with camera ID
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
          streamId = cameraId;
        } catch (error) {
           console.error(`Error calling start stream API for ${cameraId}:`, error);
           return;
        }
      } else {
        return;
      }

      // The ffmpeg process is running, now connect JSMPEG via WebSocket.
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
      const wsUrl = `${wsProtocol}//${window.location.host}/ws-stream/${streamId}`;
      
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
      
      // Clean up preview stream if it was an RTSP URL
      if (rtspUrl) {
        fetch(`/api/stream/preview`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rtspUrl })
        }).catch(console.error);
      }
      
      document.head.removeChild(script);
    };
  }, [cameraId, rtspUrl]);

  return <canvas ref={canvasRef} className="w-full h-full object-cover bg-black" />;
}
