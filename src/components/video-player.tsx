'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Fungsi untuk inisialisasi HLS
    const initPlayer = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      
      const hls = new Hls({
        // Opsi konfigurasi untuk mengurangi latensi
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(error => console.error("Autoplay dicegah:", error));
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS Network Error, mencoba memuat ulang...', data);
              // Tambahkan mekanisme coba lagi yang lebih cerdas jika diperlukan
              setTimeout(() => hls.loadSource(src), 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS Media Error, mencoba memulihkan...', data);
              hls.recoverMediaError();
              break;
            default:
              // Jika galat fatal, hancurkan dan coba buat ulang
              console.error('HLS Error Fatal, menghancurkan dan membuat ulang.', data);
              initPlayer();
              break;
          }
        }
      });
    };

    if (Hls.isSupported()) {
      initPlayer();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Untuk Safari dan browser lain yang mendukung HLS secara native
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
         video.play().catch(error => console.error("Autoplay dicegah:", error));
      });
    }

    // Cleanup saat komponen di-unmount atau src berubah
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  return <video ref={videoRef} controls muted className="w-full h-full object-cover" />;
}
