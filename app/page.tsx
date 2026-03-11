'use client';

import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/LoginButton';
import { UserInfo } from '@/components/UserInfo';
import { useEffect } from 'react';

export default function HomePage() {
  const { session, loading, logout } = useAuth();

  // Store tokens in localStorage when page loads (from temporary cookies)
  useEffect(() => {
    // Extract tokens from temporary cookies
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue || null;
      }
      return null;
    };

    const accessToken = getCookie('temp_access_token');
    const refreshToken = getCookie('temp_refresh_token');

    if (accessToken) {
      localStorage.setItem('figma_access_token', accessToken);
      // Clear temp cookie
      document.cookie = 'temp_access_token=; max-age=0; path=/';
    }

    if (refreshToken) {
      localStorage.setItem('figma_refresh_token', refreshToken);
      // Clear temp cookie
      document.cookie = 'temp_refresh_token=; max-age=0; path=/';
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">Figma OAuth Demo</h1>

        {!session?.authenticated ? (
          <div className="flex justify-center">
            <LoginButton />
          </div>
        ) : (
          <UserInfo
            user={session.user!}
            expiresAt={session.expiresAt!}
            onLogout={logout}
          />
        )}
      </div>
    </main>
  );
}
