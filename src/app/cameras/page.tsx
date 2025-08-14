'use client';

import { useState } from 'react';
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
import { mockCameras, type Camera } from '@/lib/data';
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
  const [cameras, setCameras] = useState<Camera[]>(mockCameras);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { toast } = useToast();

  const handleDiscover = () => {
    setIsDiscovering(true);
    toast({
        title: 'Discovering Cameras...',
        description: 'Scanning the local network for ONVIF-compatible devices.',
    });
    setTimeout(() => {
      const newCameras: Camera[] = [
        { id: 'cam-9', name: 'Reception', status: 'online', ip: '192.168.1.110', location: 'Ground Floor' },
        { id: 'cam-10', name: 'Meeting Room', status: 'online', ip: '192.168.1.111', location: 'Second Floor' },
      ];
      setCameras(prev => [...prev.filter(c => !newCameras.some(nc => nc.ip === c.ip)), ...newCameras]);
      setIsDiscovering(false);
      toast({
        title: 'Discovery Complete',
        description: `Found ${newCameras.length} new cameras.`,
      });
    }, 2500);
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
                 <Button onClick={handleDiscover} disabled={isDiscovering} className="w-full sm:w-auto">
                    {isDiscovering ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Wifi className="mr-2 h-4 w-4" />
                    )}
                    Discover
                </Button>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Camera Manually</DialogTitle>
                            <DialogDescription>
                                Enter the details of your camera to add it to the system.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" placeholder="Front Door Camera" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="ip" className="text-right">IP Address</Label>
                                <Input id="ip" placeholder="192.168.1.200" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="username" className="text-right">Username</Label>
                                <Input id="username" placeholder="admin" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="password" className="text-right">Password</Label>
                                <Input id="password" type="password" className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Add Camera</Button>
                        </DialogFooter>
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
