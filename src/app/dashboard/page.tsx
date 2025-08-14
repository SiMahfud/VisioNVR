'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type Camera } from '@/lib/db';
import { getCameras } from '@/lib/db';
import { Maximize, VideoOff, LayoutGrid, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const layouts = [
  { name: '1x1', value: 'grid-cols-1', count: 1 },
  { name: '2x2', value: 'grid-cols-2', count: 4 },
  { name: '3x3', value: 'grid-cols-3', count: 9 },
  { name: '4x4', value: 'grid-cols-4', count: 16 },
];

export default function DashboardPage() {
  const [layout, setLayout] = useState(layouts[1]);
  const [cameras, setCameras] = useState<Camera[]>([]);

  useEffect(() => {
    async function loadCameras() {
        const dbCameras = await getCameras();
        setCameras(dbCameras);
    }
    loadCameras();
  }, []);


  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Grid Layout
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {layouts.map((l) => (
              <DropdownMenuItem key={l.value} onSelect={() => setLayout(l)}>
                {l.name}
                {layout.value === l.value && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={cn('grid gap-4 md:gap-6', layout.value)}>
        {cameras.slice(0, layout.count).map((camera) => (
          <Card key={camera.id} className="overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-card/50">
                <div className="grid gap-1.5">
                    <CardTitle className="text-base font-medium font-headline">{camera.name}</CardTitle>
                    <CardDescription className="text-xs">{camera.location}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
        ))}
      </div>
    </div>
  );
}
