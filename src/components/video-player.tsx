'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(error => console.error("Autoplay was prevented:", error));
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari and other browsers that support HLS natively
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
         video.play().catch(error => console.error("Autoplay was prevented:", error));
      });
    }
  }, [src]);

  return <video ref={videoRef} controls muted className="w-full h-full" />;
}
