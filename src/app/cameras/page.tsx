'use client';

import { useState, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Wifi, Loader2, Trash2, Video, KeyRound, Radio, Power, Eye, Dot, CircleDot } from 'lucide-react';
import { type Camera } from '@/lib/db';
import { getCameras, addCamera, updateCamera, deleteCamera } from '@/lib/db';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoPlayer } from '@/components/video-player';
import { ScrollArea } from '@/components/ui/scroll-area';

// Add/Edit Dialog Component
function CameraDialog({ 
  camera, 
  onSave, 
  children,
  defaultValues,
  isOpen: controlledIsOpen,
  onOpenChange: setControlledIsOpen
}: { 
  camera?: Camera | null, 
  onSave: (cam: Omit<Camera, 'id' | 'status'> | Omit<Camera, 'status'>) => Promise<void>,
  children: React.ReactNode,
  defaultValues?: Partial<Camera>,
  isOpen?: boolean,
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [isLocalOpen, setIsLocalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const isOpen = controlledIsOpen ?? isLocalOpen;
  const setIsOpen = setControlledIsOpen ?? setIsLocalOpen;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const cameraData = {
        name: formData.get('name') as string,
        ip: formData.get('ip') as string,
        location: formData.get('location') as string,
        rtspUrl: formData.get('rtspUrl') as string,
        recordingMode: formData.get('recordingMode') as 'continuous' | 'scheduled' | 'motion',
        username: formData.get('username') as string,
        password: password,
        enabled: (formData.get('enabled') as string) === 'on',
    };

    if (cameraData.name && cameraData.ip) {
        try {
            const dataToSave = camera ? { ...camera, ...cameraData, password: password || undefined } : cameraData;
            await onSave(dataToSave as any);
            toast({
                title: camera ? 'Camera Updated' : 'Camera Added',
                description: `${cameraData.name} has been saved successfully.`,
            });
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Failed to save camera.`,
            });
        }
    } else {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: `Please fill in all required fields.`,
        });
    }
  };

  useEffect(() => {
    if (isOpen) {
        setPassword('');
    }
  }, [isOpen]);
  
  useEffect(() => {
      if (defaultValues) {
        // This is a way to set form values when dialog opens with defaults
      }
  }, [defaultValues, isOpen])


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{camera ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
                    <DialogDescription>
                        {camera ? 'Update the details for this camera.' : 'Enter the details of your camera to add it to the system.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                        <Input id="name" name="name" defaultValue={defaultValues?.name ?? camera?.name} placeholder="Front Door Camera" required />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" defaultValue={defaultValues?.location ?? camera?.location} placeholder="Main Building" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ip">IP Address <span className="text-destructive">*</span></Label>
                        <Input id="ip" name="ip" defaultValue={defaultValues?.ip ?? camera?.ip} placeholder="192.168.1.200" required/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="rtspUrl">RTSP URL</Label>
                        <Input id="rtspUrl" name="rtspUrl" defaultValue={defaultValues?.rtspUrl ?? ''} placeholder="rtsp://user:pass@192.168.1.200:554/stream1" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="username">Camera Username</Label>
                        <Input id="username" name="username" defaultValue={defaultValues?.username ?? ''} placeholder="admin" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Camera Password</Label>
                        <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={camera ? "Leave blank to keep unchanged" : ""} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="recordingMode">Recording Mode</Label>
                        <Select name="recordingMode" defaultValue={camera?.recordingMode ?? 'motion'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="motion">
                                    <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-muted-foreground" /> Motion Detection</div>
                                </SelectItem>
                                <SelectItem value="continuous">
                                    <div className="flex items-center gap-2"><Video className="h-4 w-4 text-muted-foreground" /> Continuous</div>
                                </SelectItem>
                                <SelectItem value="scheduled">
                                    <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /> Scheduled</div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="enabled" name="enabled" defaultChecked={camera?.enabled ?? true} />
                        <Label htmlFor="enabled">Camera Enabled</Label>
                    </div>

                </div>
                <DialogFooter>
                    <Button type="submit">Save Camera</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  )
}

// Delete Confirmation Dialog Component
function DeleteCameraAlert({ 
  camera, 
  onDelete, 
  children 
}: { 
  camera: Camera, 
  onDelete: (id: string) => Promise<void>,
  children: React.ReactNode 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await onDelete(camera.id);
            toast({
                title: 'Camera Deleted',
                description: `${camera.name} has been removed.`,
            });
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Failed to delete camera.`,
            });
        }
    }

    return (
         <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        <span className="font-bold"> {camera.name} </span> camera.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// Preview Dialog Component
function PreviewDialog({ rtspUrl }: { rtspUrl: string | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const cameraId = btoa(rtspUrl ?? ''); // Create a temporary ID for the stream URL from the rtsp url

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!rtspUrl}>
                    <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Live Preview</DialogTitle>
                    <DialogDescription>
                        Real-time stream from the camera. Requires ffmpeg to be installed on the server.
                    </DialogDescription>
                </DialogHeader>
                <div className="aspect-video bg-black rounded-md">
                   {isOpen && rtspUrl && <VideoPlayer src={`/api/stream/${cameraId}`} />}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Discovery Dialog
function DiscoveryDialog({ children, onSave }: { children: React.ReactNode, onSave: (cam: Omit<Camera, 'id' | 'status'> | Omit<Camera, 'status'>) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [ipRangeInput, setIpRangeInput] = useState('192.168.1.1-192.168.1.254');
  const [foundCameras, setFoundCameras] = useState<any[]>([]);
  const { toast } = useToast();

  const [addCameraDialogOpen, setAddCameraDialogOpen] = useState(false);
  const [cameraDefaults, setCameraDefaults] = useState<Partial<Camera>>({});

  const handleDiscover = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDiscovering(true);
    setFoundCameras([]);

    try {
        const response = await fetch('/api/onvif-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ipRange: ipRangeInput }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setFoundCameras(data.cameras);

        toast({
            title: 'Discovery Complete',
            description: `${data.cameras.length} camera(s) found.`,
        });

    } catch (error) {
      console.error('Error during ONVIF scan:', error);
      toast({
        variant: 'destructive',
        title: 'Scan Error',
        description: `An error occurred during the ONVIF scan: ${
          error instanceof Error ? error.message : String(error)
        }`
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSaveScannedCamera = (cam: any) => {
    const rtspUri = cam.profiles?.[0]?.stream?.rtsp;
    setCameraDefaults({
        name: `${cam.information.manufacturer} ${cam.information.model}`,
        ip: cam.ip,
        rtspUrl: rtspUri || '',
    });
    setAddCameraDialogOpen(true);
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleDiscover}>
          <DialogHeader>
            <DialogTitle>Discover ONVIF Cameras</DialogTitle>
            <DialogDescription>
              Scan your local network to find compatible cameras automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-end gap-2">
              <div className="flex-grow grid gap-1.5">
                  <Label htmlFor="ip-range">IP Range (optional)</Label>
                  <Input
                    id="ip-range"
                    name="ip-range"
                    value={ipRangeInput}
                    onChange={(e) => setIpRangeInput(e.target.value)}
                    placeholder="e.g., 192.168.1.1-192.168.1.254"
                  />
              </div>
                <Button type="submit" disabled={isDiscovering}>
                  {isDiscovering ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="mr-2 h-4 w-4" />
                  )}
                  Start Scan
                </Button>
            </div>

            <ScrollArea className="h-72 border rounded-md p-2">
                 {isDiscovering && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="ml-4 text-muted-foreground">Scanning network...</p>
                    </div>
                )}
                {!isDiscovering && foundCameras.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Device</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>RTSP URL</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {foundCameras.map((cam, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">
                                    <div>{cam.information.manufacturer}</div>
                                    <div className="text-xs text-muted-foreground">{cam.information.model}</div>
                                </TableCell>
                                <TableCell>{cam.ip}:{cam.port}</TableCell>
                                <TableCell className="text-xs truncate max-w-xs">{cam.profiles?.[0]?.stream?.rtsp || 'N/A'}</TableCell>
                                <TableCell className="text-right flex gap-2 justify-end">
                                    <PreviewDialog rtspUrl={cam.profiles?.[0]?.stream?.rtsp} />
                                    <Button size="sm" onClick={() => handleSaveScannedCamera(cam)}>Save</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                )}
                 {!isDiscovering && foundCameras.length === 0 && (
                     <div className="flex items-center justify-center h-full">
                         <p className="text-muted-foreground">No cameras found. Start a scan to discover devices.</p>
                     </div>
                 )}
            </ScrollArea>
          </div>
        </form>
      </DialogContent>
    </Dialog>
     <CameraDialog onSave={onSave} isOpen={addCameraDialogOpen} onOpenChange={setAddCameraDialogOpen} defaultValues={cameraDefaults}>
        <span />
    </CameraDialog>
    </>
  );
}



export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [recorderStatus, setRecorderStatus] = useState<Record<string, boolean>>({});

  const fetchCameras = async () => {
    const dbCameras = await getCameras();
    setCameras(dbCameras);
  };
  
  const fetchRecorderStatus = async () => {
      try {
          const res = await fetch('/api/recorder/status');
          const data = await res.json();
          setRecorderStatus(data.status);
      } catch (error) {
          console.error("Failed to fetch recorder status", error);
      }
  }

  useEffect(() => {
    fetchCameras();
    fetchRecorderStatus();
    const interval = setInterval(() => {
        fetchCameras();
        fetchRecorderStatus();
    }, 5000); // Refresh camera status every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSaveCamera = async (cameraData: Omit<Camera, 'id' | 'status'> | Omit<Camera, 'status'>) => {
    if ('id' in cameraData) {
      await updateCamera(cameraData);
    } else {
      await addCamera(cameraData as Omit<Camera, 'id'|'status'>);
    }
    await fetchCameras();
  };
  
  const handleDeleteCamera = async (id: string) => {
    await deleteCamera(id);
    await fetchCameras();
  };

  const getStatusVariant = (status: Camera['status']) => {
    switch (status) {
        case 'online': return 'default';
        case 'offline': return 'destructive';
        case 'recording': return 'secondary';
        default: return 'outline';
    }
  }
  
  const isActivelyRecording = (camera: Camera) => {
      return camera.status === 'recording' || recorderStatus[camera.id];
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle className="font-headline">Camera Management</CardTitle>
                <CardDescription>
                Discover, add, and manage your security cameras.
                </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                 <DiscoveryDialog onSave={handleSaveCamera}>
                    <Button className="w-full sm:w-auto">
                        <Wifi className="mr-2 h-4 w-4" />
                        Discover
                    </Button>
                 </DiscoveryDialog>
                 <CameraDialog onSave={handleSaveCamera}>
                    <Button variant="outline" className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Manually
                    </Button>
                 </CameraDialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Recording Mode</TableHead>
              <TableHead>Recording Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cameras.map((camera) => (
              <TableRow key={camera.id}>
                <TableCell>
                  <Badge variant={getStatusVariant(camera.status)} className={cn(camera.status === 'online' && "bg-green-500 text-green-50")}>
                    {camera.status}
                  </Badge>
                </TableCell>
                 <TableCell>
                    <Badge variant={camera.enabled ? 'secondary' : 'outline'} className={cn(camera.enabled ? 'text-accent-foreground' : 'text-muted-foreground')}>
                        {camera.enabled ? 'Yes' : 'No'}
                    </Badge>
                </TableCell>
                <TableCell className="font-medium">{camera.name}</TableCell>
                <TableCell>{camera.location}</TableCell>
                <TableCell>{camera.ip}</TableCell>
                <TableCell className="capitalize">{camera.recordingMode}</TableCell>
                 <TableCell>
                    {isActivelyRecording(camera) ? (
                         <Badge variant="destructive" className="animate-pulse">
                            <CircleDot className="mr-2 h-3 w-3" />
                            Recording
                        </Badge>
                    ) : (
                         <Badge variant="outline">
                            Idle
                        </Badge>
                    )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                       <CameraDialog camera={camera} onSave={handleSaveCamera}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
                       </CameraDialog>
                       <DropdownMenuSeparator />
                       <DeleteCameraAlert camera={camera} onDelete={handleDeleteCamera}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                Delete
                            </DropdownMenuItem>
                       </DeleteCameraAlert>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}