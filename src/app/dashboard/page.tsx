
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { type Camera } from '@/lib/db';
import { getCameras, getAppSetting } from '@/lib/db';
import { Maximize, VideoOff, LayoutGrid, Check, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const layouts = [
  { name: '1x1', value: 'grid-cols-1', count: 1 },
  { name: '2x2', value: 'grid-cols-2', count: 4 },
  { name: '3x3', value: 'grid-cols-3', count: 9 },
  { name: '4x4', value: 'grid-cols-4', count: 16 },
];

function CameraCard({ camera, onMaximize }: { camera: Camera, onMaximize: (camera: Camera) => void }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-card/50">
        <div className="grid gap-1.5">
          <CardTitle className="text-base font-medium font-headline">{camera.name}</CardTitle>
          <CardDescription className="text-xs">{camera.location}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMaximize(camera)}>
          <Maximize className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 aspect-video relative">
        {camera.status === 'online' ? (
          <>
            <Image
              src={`https://placehold.co/600x400.png`}
              data-ai-hint="security camera footage"
              alt={`Live feed from ${camera.name}`}
              fill
              className="object-cover"
            />
            <Badge variant="destructive" className="absolute top-2 left-2 animate-pulse">
              LIVE
            </Badge>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted">
            <VideoOff className="h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Camera Offline</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [layout, setLayout] = useState<typeof layouts[0] | {name: string, value: string, count: number}>(layouts[1]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);

  // Highlight mode state
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightedCamera, setHighlightedCamera] = useState<Camera | null>(null);
  const [tickerCameras, setTickerCameras] = useState<Camera[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [highlightInterval, setHighlightInterval] = useState(3000);

  useEffect(() => {
    async function loadData() {
      const [dbCameras, intervalSetting] = await Promise.all([
          getCameras(),
          getAppSetting('highlightInterval')
      ]);
      
      setCameras(dbCameras);
      if (dbCameras.length > 0) {
        setHighlightedCamera(dbCameras[0]);
      }
      
      if (intervalSetting) {
          setHighlightInterval(Number(intervalSetting) * 1000);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (highlightMode && cameras.length > 1) {
      const otherCameras = cameras.filter(c => c.id !== highlightedCamera?.id);
      setTickerCameras(otherCameras);

      const interval = setInterval(() => {
        setTickerIndex(prev => (prev + 1) % otherCameras.length);
      }, highlightInterval); 

      return () => clearInterval(interval);
    }
  }, [highlightMode, highlightedCamera, cameras, highlightInterval]);

  const handleSetLayout = (l: typeof layouts[0] | {name: string, value: string, count: number}) => {
    setLayout(l);
    setHighlightMode(false);
  }

  const handleSetHighlightMode = () => {
    setHighlightMode(true);
    setLayout({ name: 'Highlight', value: 'highlight', count: 0});
    if (cameras.length > 0 && !highlightedCamera) {
      setHighlightedCamera(cameras[0]);
    }
  };
  
  const visibleTickerCameras = tickerCameras.slice(tickerIndex, tickerIndex + 4).concat(tickerCameras.slice(0, Math.max(0, (tickerIndex + 4) - tickerCameras.length)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <LayoutGrid className="mr-2 h-4 w-4" />
              <span>{layout.name === 'All' ? 'All Cameras' : layout.name === 'highlight' ? 'Highlight Mode' : `Grid: ${layout.name}`}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {layouts.map((l) => (
              <DropdownMenuItem key={l.value} onSelect={() => handleSetLayout(l)}>
                Grid: {l.name}
                {layout.value === l.value && !highlightMode && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
             <DropdownMenuItem onSelect={() => handleSetLayout({ name: 'All', value: 'grid-cols-3', count: cameras.length })}>
                All Cameras
                {layout.name === 'All' && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
             <DropdownMenuItem onSelect={handleSetHighlightMode}>
                <Star className="mr-2 h-4 w-4" />
                Highlight Mode
                {highlightMode && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {highlightMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
             {highlightedCamera ? (
                 <CameraCard camera={highlightedCamera} onMaximize={setFullscreenCamera} />
             ) : (
                <Card className="aspect-video flex items-center justify-center bg-muted">
                    <p>No camera selected</p>
                </Card>
             )}
          </div>
          <div className="lg:col-span-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-4">
            {cameras.length > 1 && visibleTickerCameras.map(camera => (
              <Card 
                key={camera.id} 
                className="overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                onClick={() => setHighlightedCamera(camera)}
                >
                <CardContent className="p-0 aspect-video relative">
                  <Image
                      src={`https://placehold.co/300x200.png`}
                      data-ai-hint="security camera footage"
                      alt={`Thumbnail of ${camera.name}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-0 w-full bg-black/50 p-1 text-center">
                        <p className="text-white text-xs truncate">{camera.name}</p>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className={cn('grid gap-4 md:gap-6', layout.value)}>
          {cameras.slice(0, layout.count).map((camera) => (
            <CameraCard key={camera.id} camera={camera} onMaximize={setFullscreenCamera} />
          ))}
        </div>
      )}

      <Dialog open={!!fullscreenCamera} onOpenChange={(open) => !open && setFullscreenCamera(null)}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          <DialogHeader className="p-4 flex-row items-center justify-between absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent z-10">
            {fullscreenCamera && <DialogTitle className="text-white">{fullscreenCamera.name} - {fullscreenCamera.location}</DialogTitle>}
            <Button variant="ghost" size="icon" onClick={() => setFullscreenCamera(null)} className="h-8 w-8 text-white hover:text-white hover:bg-white/20">
                <X className="h-5 w-5"/>
            </Button>
          </DialogHeader>
          <div className="h-full w-full bg-black flex items-center justify-center">
             {fullscreenCamera && fullscreenCamera.status === 'online' ? (
                <Image
                    src={`https://placehold.co/1920x1080.png`}
                    data-ai-hint="security camera footage"
                    alt={`Live feed from ${fullscreenCamera.name}`}
                    width={1920}
                    height={1080}
                    className="object-contain w-full h-full"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-muted">
                  <VideoOff className="h-24 w-24 text-muted-foreground" />
                  <p className="mt-4 text-lg text-muted-foreground">Camera Offline</p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
