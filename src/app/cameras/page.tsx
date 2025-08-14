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
import { MoreHorizontal, PlusCircle, Wifi, Loader2 } from 'lucide-react';
import { type Camera } from '@/lib/data';
import { getCameras, addCamera } from '@/lib/db';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadCameras() {
        const dbCameras = await getCameras();
        setCameras(dbCameras);
    }
    loadCameras();
  }, []);

  const handleDiscover = () => {
    setIsDiscovering(true);
    toast({
        title: 'Discovering Cameras...',
        description: 'Scanning the local network for ONVIF-compatible devices.',
    });
    setTimeout(() => {
      // This would be a call to a backend service in a real app
      // For now, we'll just show a toast.
      setIsDiscovering(false);
      toast({
        title: 'Discovery Complete',
        description: `No new cameras found.`,
      });
    }, 2500);
  };
  
  const handleAddCamera = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newCamera = {
        name: formData.get('name') as string,
        ip: formData.get('ip') as string,
        location: 'Custom',
    };

    if (newCamera.name && newCamera.ip) {
        try {
            await addCamera(newCamera);
            const dbCameras = await getCameras();
            setCameras(dbCameras);
            toast({
                title: 'Camera Added',
                description: `${newCamera.name} has been added successfully.`,
            });
            setIsAddDialogOpen(false); // Close dialog on success
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Failed to add camera.`,
            });
        }
    } else {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: `Please fill in all fields.`,
        });
    }
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
                 <Button onClick={handleDiscover} disabled={isDiscovering} className="w-full sm:w-auto">
                    {isDiscovering ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Wifi className="mr-2 h-4 w-4" />
                    )}
                    Discover
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleAddCamera}>
                            <DialogHeader>
                                <DialogTitle>Add Camera Manually</DialogTitle>
                                <DialogDescription>
                                    Enter the details of your camera to add it to the system.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input id="name" name="name" placeholder="Front Door Camera" className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="ip" className="text-right">IP Address</Label>
                                    <Input id="ip" name="ip" placeholder="192.168.1.200" className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="username" className="text-right">Username</Label>
                                    <Input id="username" name="username" placeholder="admin" className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">Password</Label>
                                    <Input id="password" name="password" type="password" className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Add Camera</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Reboot</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                        Delete
                      </DropdownMenuItem>
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
