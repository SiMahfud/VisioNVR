'use client';

import { useState, useRef, type MouseEvent, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Camera } from '@/lib/data';
import { getCameras } from '@/lib/db';
import Image from 'next/image';
import { Bot, Trash2, Milestone, Footprints, AlertTriangle, Save, Bell } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from '@/components/ui/toast';


type Zone = { id: number; x: number; y: number; width: number; height: number };

function AnalyticsCanvas() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempZone, setTempZone] = useState<Zone | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setIsDrawing(true);
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setTempZone({
        id: -1,
        x: Math.min(startPoint.x, currentX),
        y: Math.min(startPoint.y, currentY),
        width: Math.abs(currentX - startPoint.x),
        height: Math.abs(currentY - startPoint.y),
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (tempZone && tempZone.width > 10 && tempZone.height > 10) {
        setZones(prev => [...prev, { ...tempZone, id: Date.now() }]);
    }
    setTempZone(null);
    setStartPoint(null);
  };

  return (
    <div 
        ref={canvasRef}
        className="aspect-video w-full relative bg-black cursor-crosshair overflow-hidden rounded-md"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
        <Image
            src="https://placehold.co/1280x720.png"
            data-ai-hint="security camera street"
            alt="Camera feed for analytics"
            fill
            className="object-cover"
        />
        {zones.map((zone) => (
            <div
                key={zone.id}
                className="absolute border-2 border-accent bg-accent/20 cursor-default"
                style={{
                    left: `${zone.x}px`,
                    top: `${zone.y}px`,
                    width: `${zone.width}px`,
                    height: `${zone.height}px`,
                }}
            >
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setZones(zones.filter(z => z.id !== zone.id))
                    }}
                    className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1 z-10 cursor-pointer">
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>
        ))}
        {tempZone && (
             <div
             className="absolute border-2 border-dashed border-accent bg-accent/20"
             style={{
                 left: `${tempZone.x}px`,
                 top: `${tempZone.y}px`,
                 width: `${tempZone.width}px`,
                 height: `${tempZone.height}px`,
             }}
             />
        )}
    </div>
  );
}

export default function AnalyticsPage() {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>();
    const { toast } = useToast();

    useEffect(() => {
        async function loadCameras() {
            const dbCameras = await getCameras();
            setCameras(dbCameras);
            if (dbCameras.length > 0) {
                setSelectedCameraId(dbCameras[0].id);
            }
        }
        loadCameras();
    }, []);

    const handleSaveChanges = () => {
        toast({
            title: "Settings Saved",
            description: "Your video analytics settings have been updated.",
            action: <ToastAction altText="Close"><Bell className="h-5 w-5 text-accent" /></ToastAction>,
        })
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Analytics Configuration</CardTitle>
                        <CardDescription>Draw zones on the camera feed to set up analytics.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AnalyticsCanvas />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bot className="h-6 w-6 text-primary" />
                            <CardTitle className="font-headline">Analytics Settings</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div>
                            <Label htmlFor="camera-select" className="mb-2 block">Select Camera</Label>
                            <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                                <SelectTrigger id="camera-select">
                                    <SelectValue placeholder="Select a camera" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cameras.map(camera => (
                                        <SelectItem key={camera.id} value={camera.id}>
                                            {camera.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Tabs defaultValue="intrusion">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="intrusion"><Footprints className="mr-2 h-4 w-4" /> Intrusion</TabsTrigger>
                                <TabsTrigger value="line-crossing"><Milestone className="mr-2 h-4 w-4" /> Line Crossing</TabsTrigger>
                            </TabsList>
                            <TabsContent value="intrusion" className="mt-4 grid gap-4">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="intrusion-switch">Enable Intrusion Detection</Label>
                                        <p className="text-xs text-muted-foreground">Alert when an object enters a defined zone.</p>
                                    </div>
                                    <Switch id="intrusion-switch" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Sensitivity</Label>
                                    <Slider defaultValue={[50]} max={100} step={1} />
                                </div>
                            </TabsContent>
                            <TabsContent value="line-crossing" className="mt-4 grid gap-4">
                               <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="line-crossing-switch">Enable Line Crossing</Label>
                                        <p className="text-xs text-muted-foreground">Alert when an object crosses a virtual line.</p>
                                    </div>
                                    <Switch id="line-crossing-switch" defaultChecked />
                                </div>
                                <p className="text-sm text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                                    <AlertTriangle className="inline-block mr-2 h-4 w-4" />
                                    To define a line, draw a very thin rectangle on the feed.
                                </p>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                 <Button size="lg" onClick={handleSaveChanges}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
