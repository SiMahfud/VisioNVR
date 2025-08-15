
'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

// src sekarang adalah ID kamera (URL RTSP yang di-encode)
export function VideoPlayer({ src: cameraId }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cameraId) return;

    const video = videoRef.current;
    if (!video) return;

    // URL ke playlist HLS di folder public
    const hlsSrc = `/hls/${cameraId}/stream.m3u8`;

    // Fungsi untuk memulai streaming
    const startStream = async () => {
      try {
        // Langkah 1: Panggil API untuk memastikan ffmpeg berjalan
        const response = await fetch(`/api/stream/${cameraId}`, { method: 'POST' });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to start stream: ${response.status} ${errorText}`);
        }
        console.log(`Stream for ${cameraId} confirmed active. Loading HLS...`);
        setError(null);
        
        // Langkah 2: Muat sumber HLS ke pemutar video
        if (Hls.isSupported()) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }
          const hls = new Hls({
            lowLatencyMode: true,
            backBufferLength: 90,
          });
          hlsRef.current = hls;

          hls.loadSource(hlsSrc);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(err => console.error("Autoplay was prevented:", err));
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.error(`HLS fatal error for ${cameraId}:`, data);
              setError('Stream error. Attempting to recover...');
              switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                   // Coba muat ulang sumber setelah jeda singkat
                  setTimeout(() => hls.loadSource(hlsSrc), 2000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  // Hancurkan dan coba lagi dari awal
                   hls.destroy();
                   setTimeout(startStream, 5000);
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsSrc;
          video.addEventListener('loadedmetadata', () => {
            video.play().catch(err => console.error("Autoplay was prevented:", err));
          });
        }
      } catch (e) {
        console.error(`Failed to initiate stream for ${cameraId}:`, e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      }
    };
    
    startStream();

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [cameraId]);

  if (error) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center p-4">
        <p className="text-destructive-foreground text-center text-sm">{error}</p>
      </div>
    )
  }

  return <video ref={videoRef} controls muted className="w-full h-full object-cover" />;
}
