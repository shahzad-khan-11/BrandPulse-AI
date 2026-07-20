/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'analyst';
  isVerified: boolean;
  username?: string;
  phoneNumber?: string;
  company?: string;
  bio?: string;
  profileImage?: string;
  lastLogin?: string;
  createdAt?: string;
  organization?: {
    _id?: string;
    name: string;
    slug: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: 'light' | 'dark';
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, orgName: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
  updateUser: (userData: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    const resolved = (saved as 'light' | 'dark') || 'dark';
    // Apply immediately to prevent flash of wrong theme
    const root = window.document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    return resolved;
  });

  // Verify auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          if (res.data.success) {
            setUser(res.data.user);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen to global unauthorized events from API client
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  // Sync theme to root html element
  // We set both 'dark' (for Tailwind dark: variants) and 'light' (for CSS variable overrides).
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync compact layout on mount
  useEffect(() => {
    const isCompact = localStorage.getItem('compact-layout') === 'true';
    const root = window.document.documentElement;
    if (isCompact) {
      root.classList.add('compact-layout');
    } else {
      root.classList.remove('compact-layout');
    }
  }, []);

  // Fetch settings when user changes (login or boot verified)
  useEffect(() => {
    if (user) {
      api.get('/settings').then(res => {
        if (res.data?.success) {
          const s = res.data.data.settings;
          // Apply theme
          if (s.theme && s.theme !== theme) {
            setTheme(s.theme);
          }
          // Apply compact layout
          const root = window.document.documentElement;
          if (s.compactLayout) {
            root.classList.add('compact-layout');
            localStorage.setItem('compact-layout', 'true');
          } else {
            root.classList.remove('compact-layout');
            localStorage.setItem('compact-layout', 'false');
          }
          // Apply sidebar collapsed
          localStorage.setItem('sidebar-collapsed', String(s.sidebarCollapsed ?? false));
          window.dispatchEvent(new CustomEvent('sync-sidebar-collapse', { detail: s.sidebarCollapsed ?? false }));
        }
      }).catch(err => {
        console.error('Failed to load user settings on login:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
    }
  };

  const register = async (name: string, email: string, password: string, orgName: string) => {
    const res = await api.post('/auth/register', { name, email, password, orgName });
    if (res.data.success) {
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { token: refreshToken });
      }
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, theme, login, register, logout, toggleTheme, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
