'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, Camera, Play, Pause } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { mockCameras, mockMotionEvents } from '@/lib/data';
import { format } from 'date-fns';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';


function Timeline() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className="relative w-full h-20 bg-muted/20 rounded-lg overflow-hidden">
      <div className="flex h-full">
        {hours.map(hour => (
          <div key={hour} className="flex-1 border-r border-border/50 relative">
            <span className="absolute top-1 left-1 text-xs text-muted-foreground">{hour.toString().padStart(2, '0')}:00</span>
          </div>
        ))}
      </div>
       {mockMotionEvents.map(event => {
            const startOfDay = new Date(event.startTime);
            startOfDay.setHours(0, 0, 0, 0);
            const totalDaySeconds = 24 * 60 * 60;
            
            const startSeconds = (event.startTime.getTime() - startOfDay.getTime()) / 1000;
            const endSeconds = (event.endTime.getTime() - startOfDay.getTime()) / 1000;
            
            const left = (startSeconds / totalDaySeconds) * 100;
            const width = ((endSeconds - startSeconds) / totalDaySeconds) * 100;

            return (
                 <div
                    key={event.id}
                    className="absolute bottom-0 h-2/3 bg-primary/70 hover:bg-primary rounded-sm transition-colors cursor-pointer"
                    style={{ left: `${left}%`, width: `${Math.max(width, 0.2)}%` }}
                 >
                    <Popover>
                        <PopoverTrigger className='w-full h-full' />
                        <PopoverContent>
                            <p className="font-semibold">Motion Detected</p>
                            <p className="text-sm text-muted-foreground">
                                {format(event.startTime, 'HH:mm:ss')} - {format(event.endTime, 'HH:mm:ss')}
                            </p>
                        </PopoverContent>
                    </Popover>
                 </div>
            )
        })}
    </div>
  );
}


export default function PlaybackPage() {
  const [selectedCamera, setSelectedCamera] = useState(mockCameras[0]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardContent className="p-0 aspect-video relative bg-black">
            <Image
                src={`https://placehold.co/1280x720.png`}
                data-ai-hint="security camera park"
                alt={`Playback for ${selectedCamera.name}`}
                fill
                className="object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center">
                  <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="h-8 w-8 text-white" /> : <Play className="h-8 w-8 text-white" />}
                  </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <Timeline />
            </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Playback Options</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div>
                    <h3 className="text-sm font-medium mb-2">Select Camera</h3>
                     <Select
                        value={selectedCamera.id}
                        onValueChange={(id) => {
                            const cam = mockCameras.find(c => c.id === id);
                            if (cam) setSelectedCamera(cam);
                        }}
                    >
                        <SelectTrigger className="w-full">
                             <SelectValue placeholder="Select a camera..." />
                        </SelectTrigger>
                        <SelectContent>
                            {mockCameras.map((camera) => (
                                <SelectItem key={camera.id} value={camera.id}>
                                    <div className="flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-muted-foreground" />
                                        <span>{camera.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <h3 className="text-sm font-medium mb-2">Select Date</h3>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Export Clip
                </Button>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Motion Events</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
                <div className="grid gap-4">
                    {mockMotionEvents.map(event => (
                        <div key={event.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                            <Image src={event.thumbnail} alt="Motion event thumbnail" width={80} height={50} className="rounded-md" data-ai-hint="motion blur" />
                            <div>
                                <p className="text-sm font-medium">{format(event.startTime, 'HH:mm:ss')}</p>
                                <p className="text-xs text-muted-foreground">Duration: {format(new Date(event.endTime.getTime() - event.startTime.getTime()), 'm \'m\' ss \'s\'')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
