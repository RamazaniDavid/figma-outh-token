'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  handle: string;
  email: string;
  img_url: string;
}

interface SessionData {
  authenticated: boolean;
  user?: User;
  expiresAt?: number;
}

export function useAuth() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error('Failed to fetch session:', error);
      setSession({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('figma_access_token');
    localStorage.removeItem('figma_refresh_token');
    setSession({ authenticated: false });
  };

  return { session, loading, logout, refetch: fetchSession };
}
