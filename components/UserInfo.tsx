'use client';

import { useEffect, useState } from 'react';
import { TokenDisplay } from './TokenDisplay';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

interface UserInfoProps {
  user: {
    handle: string;
    email: string;
    img_url: string;
  };
  expiresAt: number;
  onLogout: () => void;
}

export function UserInfo({ user, expiresAt, onLogout }: UserInfoProps) {
  const [accessToken, setAccessToken] = useState<string>('');

  // Auto refresh token
  useTokenRefresh(expiresAt, () => {
    // Reload tokens from localStorage after refresh
    const newToken = localStorage.getItem('figma_access_token');
    if (newToken) setAccessToken(newToken);
  });

  useEffect(() => {
    // Get access token from localStorage
    const token = localStorage.getItem('figma_access_token');
    if (token) setAccessToken(token);
  }, []);

  const timeUntilExpiry = Math.max(0, expiresAt - Date.now());
  const minutesLeft = Math.floor(timeUntilExpiry / 60000);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.img_url} alt={user.handle} className="w-16 h-16 rounded-full" />
        <div>
          <h2 className="text-xl font-bold">@{user.handle}</h2>
          <p className="text-gray-600">{user.email}</p>
        </div>
      </div>

      {accessToken && <TokenDisplay token={accessToken} />}

      <div className="text-sm text-gray-600">
        Token expires in {minutesLeft} minutes
      </div>

      <button
        onClick={onLogout}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
      >
        Logout
      </button>
    </div>
  );
}
