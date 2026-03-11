'use client';

import { useEffect } from 'react';

export function useTokenRefresh(expiresAt?: number, onRefresh?: () => void) {
  useEffect(() => {
    if (!expiresAt) return;

    // Refresh 5 minutes before expiration
    const refreshTime = expiresAt - Date.now() - 5 * 60 * 1000;

    if (refreshTime <= 0) {
      // Already expired or expiring soon, refresh now
      refreshToken();
      return;
    }

    const timer = setTimeout(async () => {
      await refreshToken();
      onRefresh?.();
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [expiresAt, onRefresh]);

  async function refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      const data = await response.json();

      if (data.success && data.accessToken && data.refreshToken) {
        // Update localStorage with new tokens
        localStorage.setItem('figma_access_token', data.accessToken);
        localStorage.setItem('figma_refresh_token', data.refreshToken);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }
}
