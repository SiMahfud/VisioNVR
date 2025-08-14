
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { verifyUser } from '@/lib/db';
import { type User } from '@/lib/db';
import { AppLayout } from './app-layout';

// Helper functions for cookie management
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name: string) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}


interface AuthContextType {
  user: User | null;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const token = getCookie('auth-token');
      if (token) {
        try {
          const userData = JSON.parse(atob(token));
          setUser(userData);
        } catch (error) {
          // Invalid token, logout
          eraseCookie('auth-token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    checkUser();
  }, []);

  const login = async (username: string, pass: string) => {
    const verifiedUser = await verifyUser(username, pass);
    if (verifiedUser) {
      setUser(verifiedUser);
      // In a real app, use a secure JWT. For this demo, we'll use a simple base64 encoded object.
      const token = btoa(JSON.stringify(verifiedUser));
      setCookie('auth-token', token, 1);
      if (pathname === '/login') {
          router.push('/dashboard');
      }
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
    eraseCookie('auth-token');
    router.push('/login');
  };
  
  const refreshUser = (updatedUser: User) => {
      setUser(updatedUser);
      const token = btoa(JSON.stringify(updatedUser));
      setCookie('auth-token', token, 1);
  }
  
  const isAuthPage = pathname === '/login';

  if (isLoading) {
      return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  // If we are not on an auth page and there is no user, redirect to login
  if (!isAuthPage && !user) {
    router.push('/login');
    return <div className="flex h-screen items-center justify-center">Redirecting to login...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, refreshUser }}>
      {isAuthPage ? children : <AppLayout>{children}</AppLayout>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
