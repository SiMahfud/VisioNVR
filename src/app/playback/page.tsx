'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, Camera, Play, Pause, ChevronsRight, ZoomIn, ZoomOut, Search, VideoOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { type Camera, type MotionEvent } from '@/lib/db';
import { getCameras, getMotionEvents } from '@/lib/db';
import { format } from 'date-fns';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VideoPlayer } from '@/components/video-player';


const MIN_ZOOM = 1; // 24-hour view
const MAX_ZOOM = 48; // 30-minute view
const SECONDS_IN_DAY = 24 * 60 * 60;

function Timeline({ 
    motionEvents, 
    date,
    playbackTime,
    setPlaybackTime
}: { 
    motionEvents: MotionEvent[], 
    date: Date,
    playbackTime: Date,
    setPlaybackTime: (date: Date) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1); // 1 = 24h, 2 = 12h, 4 = 6h, etc.
  const [panOffset, setPanOffset] = useState(0); // in pixels
  const [isPanning, setIsPanning] = useState(false);
  const [hoverTime, setHoverTime] = useState<Date | null>(null);

  const getTimelineWidth = () => containerRef.current?.offsetWidth ?? 0;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const timelineWidth = getTimelineWidth();
    const pointerX = e.nativeEvent.offsetX;
    const oldZoom = zoom;
    
    // Determine new zoom level
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (1 - e.deltaY / 100)));
    setZoom(newZoom);

    // Adjust pan offset to zoom in on the pointer
    const newPanOffset = (panOffset + pointerX) * (newZoom / oldZoom) - pointerX;
    setPanOffset(-Math.max(0, Math.min(timelineWidth * newZoom - timelineWidth, newPanOffset)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    // Set cursor to grabbing
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const timelineWidth = getTimelineWidth();
      setPanOffset(prev => -Math.max(0, Math.min(timelineWidth * zoom - timelineWidth, -(prev + e.movementX))));
    }
     // Calculate and set hover time
    const rect = containerRef.current?.getBoundingClientRect();
    if(rect) {
        const x = e.clientX - rect.left;
        const totalWidth = getTimelineWidth() * zoom;
        const timeInSeconds = ((x - panOffset) / totalWidth) * SECONDS_IN_DAY;
        
        if (timeInSeconds >= 0 && timeInSeconds <= SECONDS_IN_DAY) {
            const newHoverTime = new Date(date);
            newHoverTime.setHours(0, 0, 0, 0);
            newHoverTime.setSeconds(timeInSeconds);
            setHoverTime(newHoverTime);
        } else {
            setHoverTime(null);
        }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    if (containerRef.current) containerRef.current.style.cursor = 'pointer';

    // Jump to time on click (if not a drag)
    if (e.movementX === 0 && e.movementY === 0) {
        const rect = containerRef.current?.getBoundingClientRect();
        if(rect) {
            const x = e.clientX - rect.left;
            const totalWidth = getTimelineWidth() * zoom;
            const timeInSeconds = ((x - panOffset) / totalWidth) * SECONDS_IN_DAY;

            if (timeInSeconds >= 0 && timeInSeconds <= SECONDS_IN_DAY) {
                const newTime = new Date(date);
                newTime.setHours(0, 0, 0, 0);
                newTime.setSeconds(timeInSeconds);
                setPlaybackTime(newTime);
            }
        }
    }
  };
  
  const handleMouseLeave = () => {
    setIsPanning(false);
    setHoverTime(null);
    if (containerRef.current) containerRef.current.style.cursor = 'pointer';
  };


  const renderTimeGrid = () => {
    const totalWidth = getTimelineWidth() * zoom;
    const hours = 24 / zoom;
    let increment = 1; // hours
    let subIncrement = 15; // minutes

    if (zoom > 4) increment = 0.5; // 30 mins
    if (zoom > 8) increment = 0.25; // 15 mins
    if (zoom > 16) { increment = 5 / 60; subIncrement = 1; } // 5 mins
    if (zoom > 32) { increment = 1 / 60; subIncrement = 0.25; } // 1 min

    const numMarkers = 24 / increment;
    
    return Array.from({ length: numMarkers }).map((_, i) => {
        const markerTime = i * increment * 3600; // in seconds
        const xPos = (markerTime / SECONDS_IN_DAY) * totalWidth;
        const isHour = i * increment % 1 === 0;

        return (
            <div key={i} className="absolute h-full" style={{ left: `${panOffset + xPos}px` }}>
                <div className={cn("w-px h-full", isHour ? 'bg-border' : 'bg-border/50')}></div>
                <span className="absolute top-1 left-1 text-xs text-muted-foreground">
                    {format(new Date(date).setHours(0,0,markerTime), 'HH:mm')}
                </span>
            </div>
        );
    });
  };

  const getSecondsFromStartOfDay = (d: Date) => {
    const startOfDay = new Date(d);
    startOfDay.setHours(0, 0, 0, 0);
    return (d.getTime() - startOfDay.getTime()) / 1000;
  }

  return (
    <TooltipProvider>
    <div
      ref={containerRef}
      className="relative w-full h-20 bg-muted/20 rounded-lg overflow-hidden cursor-pointer"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full h-full">
         {renderTimeGrid()}

         {motionEvents.map(event => {
            const totalWidth = getTimelineWidth() * zoom;
            const startSeconds = getSecondsFromStartOfDay(new Date(event.startTime));
            const endSeconds = getSecondsFromStartOfDay(new Date(event.endTime));
            
            const left = panOffset + (startSeconds / SECONDS_IN_DAY) * totalWidth;
            const width = ((endSeconds - startSeconds) / SECONDS_IN_DAY) * totalWidth;

            return (
                 <Tooltip key={event.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                         <div
                            className="absolute bottom-0 h-2/3 bg-primary/70 hover:bg-primary rounded-sm transition-colors"
                            style={{ left: `${left}px`, width: `${Math.max(width, 2)}px` }}
                         />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="font-semibold">Motion Detected</p>
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(event.startTime), 'HH:mm:ss')} - {format(new Date(event.endTime), 'HH:mm:ss')}
                        </p>
                    </TooltipContent>
                </Tooltip>
            )
        })}

        {/* Playback Time Indicator */}
        <div 
            className="absolute top-0 h-full w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${panOffset + (getSecondsFromStartOfDay(playbackTime) / SECONDS_IN_DAY) * getTimelineWidth() * zoom}px`}}
        >
            <div className="absolute -top-2 -left-2.5 w-5 h-5 bg-red-500 rounded-full border-2 border-background"></div>
        </div>

        {/* Hover Time Indicator */}
        {hoverTime && (
             <div 
                className="absolute top-0 h-full w-px bg-muted-foreground/50 z-20 pointer-events-none"
                style={{ left: `${panOffset + (getSecondsFromStartOfDay(hoverTime) / SECONDS_IN_DAY) * getTimelineWidth() * zoom}px`}}
            >
                 <div className="absolute top-full mt-1 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded">
                    {format(hoverTime, 'HH:mm:ss')}
                </div>
            </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}


export default function PlaybackPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [motionEvents, setMotionEvents] = useState<MotionEvent[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | undefined>();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackSpeeds = [0.5, 1, 2, 4];
  const [playbackTime, setPlaybackTime] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<MotionEvent | null>(null);


  useEffect(() => {
    async function loadCameras() {
        const dbCameras = await getCameras();
        setCameras(dbCameras);
        if (dbCameras.length > 0) {
            setSelectedCamera(dbCameras[0]);
        }
    }
    loadCameras();
  }, []);

  useEffect(() => {
    async function loadEvents() {
        if (selectedCamera && date) {
            const events = await getMotionEvents(selectedCamera.id, date);
            setMotionEvents(events);
            setSelectedEvent(null);
            // Set initial playback time to the start of the day or first event
            const newPlaybackTime = new Date(date);
            newPlaybackTime.setHours(0,0,0,0);
            setPlaybackTime(newPlaybackTime);
        }
    }
    loadEvents();
  }, [selectedCamera, date]);
  
  const handleSetPlaybackTime = (newTime: Date) => {
    setPlaybackTime(newTime);
  };

  const handleEventClick = (event: MotionEvent) => {
    handleSetPlaybackTime(new Date(event.startTime));
    setSelectedEvent(event);
  };


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardContent className="p-0 aspect-video relative bg-black flex items-center justify-center">
            {selectedEvent && selectedCamera ? (
                 // The VideoPlayer component will handle the HLS stream from our new API route
                 <VideoPlayer src={`/api/playback/${selectedEvent.id}`} />
            ) : (
                <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                    <VideoOff className="h-10 w-10" />
                    <p>Select a motion event to view playback</p>
                </div>
            )}
             <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded-md text-sm font-mono pointer-events-none">
                {format(playbackTime, 'yyyy-MM-dd HH:mm:ss')}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:bg-white/20 hover:text-white" disabled={!selectedEvent}>
                      {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                  </Button>
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white" disabled={!selectedEvent}>
                            <ChevronsRight className="h-5 w-5 mr-2" /> {playbackSpeed}x
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {playbackSpeeds.map(speed => (
                            <DropdownMenuItem key={speed} onSelect={() => setPlaybackSpeed(speed)}>
                                {speed}x
                            </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="font-headline">Timeline</CardTitle>
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Scroll to zoom, drag to pan</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {date && <Timeline 
                    motionEvents={motionEvents} 
                    date={date} 
                    playbackTime={playbackTime}
                    setPlaybackTime={handleSetPlaybackTime}
                />}
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
                        value={selectedCamera?.id}
                        onValueChange={(id) => {
                            const cam = cameras.find(c => c.id === id);
                            if (cam) setSelectedCamera(cam);
                        }}
                    >
                        <SelectTrigger className="w-full">
                             <SelectValue placeholder="Select a camera..." />
                        </SelectTrigger>
                        <SelectContent>
                            {cameras.map((camera) => (
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
                <Button disabled={!selectedEvent}>
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
                    {motionEvents.map(event => (
                        <div key={event.id} className={cn("flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 cursor-pointer", selectedEvent?.id === event.id && "bg-primary/20 hover:bg-primary/30")} onClick={() => handleEventClick(event)}>
                            <Image src={event.thumbnail} alt="Motion event thumbnail" width={80} height={50} className="rounded-md" data-ai-hint="motion blur" />
                            <div>
                                <p className="text-sm font-medium">{format(new Date(event.startTime), 'HH:mm:ss')}</p>
                                <p className="text-xs text-muted-foreground">Duration: {format(new Date(new Date(event.endTime).getTime() - new Date(event.startTime).getTime()), 'm \'m\' ss \'s\'')}</p>
                            </div>
                        </div>
                    ))}
                    {motionEvents.length === 0 && (
                        <div className="text-center text-muted-foreground py-10">
                            <p>No motion events for this day.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
