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
import { MoreHorizontal, PlusCircle, Wifi, Loader2, Trash2, Video, KeyRound, Radio, Power } from 'lucide-react';
import { type Camera } from '@/lib/db';
import { getCameras, addCamera, updateCamera, deleteCamera } from '@/lib/db';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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


// Add/Edit Dialog Component
function CameraDialog({ 
  camera, 
  onSave, 
  children 
}: { 
  camera?: Camera | null, 
  onSave: (cam: Omit<Camera, 'id' | 'status'> | Omit<Camera, 'status'>) => Promise<void>,
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();

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
  }, [isOpen])


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{camera ? 'Edit Camera' : 'Add Camera Manually'}</DialogTitle>
                    <DialogDescription>
                        {camera ? 'Update the details for this camera.' : 'Enter the details of your camera to add it to the system.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                        <Input id="name" name="name" defaultValue={camera?.name} placeholder="Front Door Camera" required />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" defaultValue={camera?.location} placeholder="Main Building" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ip">IP Address <span className="text-destructive">*</span></Label>
                        <Input id="ip" name="ip" defaultValue={camera?.ip} placeholder="192.168.1.200" required/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="rtspUrl">RTSP URL</Label>
                        <Input id="rtspUrl" name="rtspUrl" defaultValue={camera?.rtspUrl ?? ''} placeholder="rtsp://user:pass@192.168.1.200:554/stream1" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="username">Camera Username</Label>
                        <Input id="username" name="username" defaultValue={camera?.username ?? ''} placeholder="admin" />
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

// Discovery Dialog
function DiscoveryDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { toast } = useToast();

  const handleDiscover = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDiscovering(true);
    toast({
        title: 'Discovering Cameras...',
        description: 'Scanning the local network for ONVIF-compatible devices.',
    });
    setTimeout(() => {
      setIsDiscovering(false);
      setIsOpen(false);
      toast({
        title: 'Discovery Complete',
        description: `No new cameras found.`,
      });
    }, 2500);
  };
    
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
            <form onSubmit={handleDiscover}>
                <DialogHeader>
                    <DialogTitle>Discover ONVIF Cameras</DialogTitle>
                     <DialogDescription>
                        Scan your local network to find compatible cameras automatically.
                     </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ip-range-start" className="text-right">IP Range</Label>
                        <div className="col-span-3 flex items-center gap-2">
                             <Input id="ip-range-start" name="ip-range-start" placeholder="192.168.1.1" />
                             <span>-</span>
                             <Input id="ip-range-end" name="ip-range-end" placeholder="192.168.1.255" />
                        </div>
                    </div>
                </div>
                 <DialogFooter>
                    <Button type="submit" disabled={isDiscovering}>
                        {isDiscovering ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wifi className="mr-2 h-4 w-4" />
                        )}
                        Start Scan
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}


export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);

  const fetchCameras = async () => {
    const dbCameras = await getCameras();
    setCameras(dbCameras);
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleSaveCamera = async (cameraData: Omit<Camera, 'id' | 'status'> | Omit<Camera, 'status'>) => {
    if ('id' in cameraData) {
      await updateCamera(cameraData);
    } else {
      await addCamera(cameraData as Omit<Camera, 'id'|'status'|'enabled'>);
    }
    await fetchCameras();
  };
  
  const handleDeleteCamera = async (id: string) => {
    await deleteCamera(id);
    await fetchCameras();
  };

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
                 <DiscoveryDialog>
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
              <TableHead>Recording</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cameras.map((camera) => (
              <TableRow key={camera.id}>
                <TableCell>
                  <Badge variant={camera.status === 'online' ? 'default' : 'destructive'} className={cn(camera.status === 'online' && 'bg-accent text-accent-foreground')}>
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
