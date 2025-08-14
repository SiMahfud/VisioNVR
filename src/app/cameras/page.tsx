'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { MoreHorizontal, PlusCircle, Wifi, Loader2, Trash2 } from 'lucide-react';
import { type Camera } from '@/lib/data';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";


// Add/Edit Dialog Component
function CameraDialog({ 
  camera, 
  onSave, 
  children 
}: { 
  camera?: Camera | null, 
  onSave: (cam: Omit<Camera, 'id' | 'status'> | Camera) => Promise<void>,
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const cameraData = {
        name: formData.get('name') as string,
        ip: formData.get('ip') as string,
        location: formData.get('location') as string,
    };

    if (cameraData.name && cameraData.ip && cameraData.location) {
        try {
            await onSave(camera ? { ...camera, ...cameraData } : cameraData);
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
            description: `Please fill in all fields.`,
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{camera ? 'Edit Camera' : 'Add Camera Manually'}</DialogTitle>
                    <DialogDescription>
                        {camera ? 'Update the details of your camera.' : 'Enter the details of your camera to add it to the system.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" defaultValue={camera?.name} placeholder="Front Door Camera" className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="location" className="text-right">Location</Label>
                        <Input id="location" name="location" defaultValue={camera?.location} placeholder="Main Building" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ip" className="text-right">IP Address</Label>
                        <Input id="ip" name="ip" defaultValue={camera?.ip} placeholder="192.168.1.200" className="col-span-3" />
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

  const handleSaveCamera = async (cameraData: Omit<Camera, 'id' | 'status'> | Camera) => {
    if ('id' in cameraData) {
      await updateCamera(cameraData);
    } else {
      await addCamera(cameraData);
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
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>IP Address</TableHead>
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
                <TableCell className="font-medium">{camera.name}</TableCell>
                <TableCell>{camera.location}</TableCell>
                <TableCell>{camera.ip}</TableCell>
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
