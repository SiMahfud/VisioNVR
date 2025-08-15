
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type User, updateUser, getAppSetting, setAppSetting } from '@/lib/db';
import { Settings, UserCircle, Save, HardDrive } from 'lucide-react';
import { useRouter } from 'next/navigation';


function ProfileSettings({ user, onUpdate }: { user: User, onUpdate: (user: User) => void }) {
    const [name, setName] = useState(user.name);
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { toast } = useToast();

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password && password !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
            return;
        }
        
        try {
            const updatedUser: User = { ...user, name, username, ...(password && { password }) };
            await updateUser(updatedUser);
            onUpdate(updatedUser);
            toast({ title: 'Profile Updated', description: 'Your profile details have been saved.' });
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
        }
    };

    return (
         <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <UserCircle className="h-6 w-6 text-primary" />
                    <CardTitle className="font-headline">User Profile</CardTitle>
                </div>
                <CardDescription>Update your personal information and password.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleProfileSubmit} className="grid gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!password} />
                        </div>
                    </div>
                    <Button type="submit" className="mt-2 w-fit">
                        <Save className="mr-2 h-4 w-4" /> Save Profile
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function AppSettings() {
    const [interval, setInterval] = useState('3');
    const [maxStorage, setMaxStorage] = useState('500');
    const { toast } = useToast();

    useEffect(() => {
        async function loadSettings() {
            const [highlightInterval, maxStorageGb] = await Promise.all([
                getAppSetting('highlightInterval'),
                getAppSetting('maxStorageGb')
            ]);

            if (highlightInterval) {
                setInterval(highlightInterval);
            }
            if (maxStorageGb) {
                setMaxStorage(maxStorageGb);
            }
        }
        loadSettings();
    }, []);

    const handleAppSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await Promise.all([
                setAppSetting('highlightInterval', interval),
                setAppSetting('maxStorageGb', maxStorage),
            ]);
            toast({ title: 'Settings Saved', description: 'Application settings have been updated.' });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to save application settings.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                 <div className="flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" />
                    <CardTitle className="font-headline">Application Settings</CardTitle>
                </div>
                <CardDescription>Configure application-wide settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAppSettingsSubmit} className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="highlight-interval">Highlight View Rotation Interval (seconds)</Label>
                            <Input id="highlight-interval" type="number" value={interval} onChange={(e) => setInterval(e.target.value)} min="1" required />
                            <p className="text-xs text-muted-foreground">How often the small cameras should rotate in highlight view.</p>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="max-storage"><HardDrive className="inline h-4 w-4 mr-1" />Maximum Storage Size (GB)</Label>
                            <Input id="max-storage" type="number" value={maxStorage} onChange={(e) => setMaxStorage(e.target.value)} min="1" required />
                            <p className="text-xs text-muted-foreground">The recorder will delete the oldest files when storage exceeds this limit.</p>
                        </div>
                    </div>
                    <Button type="submit" className="mt-2 w-fit">
                        <Save className="mr-2 h-4 w-4" /> Save Settings
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function SettingsPage() {
    const { user, login } = useAuth();
    const router = useRouter(); 
    
    const handleUserUpdate = async (updatedUser: User) => {
      // Re-login with old password to refresh the user context
      // This is a workaround as we don't store the password in a retrievable way.
      // A better solution might involve re-fetching the user from the DB without a full re-login.
      // For this demo, we can just update the context directly.
      const { refreshUser } = useAuth();
      refreshUser(updatedUser);
    };
    
    if (!user) {
        return <p>Loading...</p>
    }

    return (
        <div className="space-y-6">
            <ProfileSettings user={user} onUpdate={handleUserUpdate} />
            <AppSettings />
        </div>
    );
}
