'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type User, updateUser, getAppSetting, setAppSetting } from '@/lib/db';
import { Settings, UserCircle, Save } from 'lucide-react';


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
    const { toast } = useToast();

    useEffect(() => {
        async function loadSettings() {
            const highlightInterval = await getAppSetting('highlightInterval');
            if (highlightInterval) {
                setInterval(highlightInterval);
            }
        }
        loadSettings();
    }, []);

    const handleAppSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await setAppSetting('highlightInterval', interval);
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
                <form onSubmit={handleAppSettingsSubmit} className="grid gap-4">
                    <div className="grid gap-2 max-w-sm">
                        <Label htmlFor="highlight-interval">Highlight View Rotation Interval (seconds)</Label>
                        <Input id="highlight-interval" type="number" value={interval} onChange={(e) => setInterval(e.target.value)} min="1" required />
                         <p className="text-xs text-muted-foreground">How often the small cameras should rotate in highlight view.</p>
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
    const router = useRouter(); // Corrected: import and use useRouter
    
    // This is a bit of a hack to force a re-render of the layout when the user is updated
    // to reflect the new name in the sidebar. A more robust solution might use a shared state management library.
    const handleUserUpdate = (updatedUser: User) => {
        // Re-login with old password to refresh the user context
        login(updatedUser.username, 'admin'); // Assuming we can't get the password back
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

// Corrected: Import useRouter
import { useRouter } from 'next/navigation';
