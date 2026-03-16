'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import ExternalBackendGenerator from './components/ExternalBackendGenerator';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface SessionData {
  authenticated: boolean;
  accessToken?: string;
  user?: User;
  expiresAt?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Get backend configuration from environment variables
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8283';

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!data.authenticated) {
          router.push('/');
          return;
        }

        setSession(data);
      } catch (error) {
        console.error('Failed to fetch session:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const copyToken = async () => {
    if (session?.accessToken) {
      try {
        await navigator.clipboard.writeText(session.accessToken);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy token:', error);
      }
    }
  };

  const handleComplete = (sectionsCount: number) => {
    console.log('Generation complete:', sectionsCount, 'sections');
  };

  const handleError = (error: string) => {
    console.error('Generation error:', error);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header with User Info */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {session.user?.avatar && (
                <img
                  src={session.user.avatar}
                  alt={session.user.name}
                  className="w-12 h-12 rounded-full border-2 border-purple-500/50"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-white">
                  {session.user?.name}
                </h1>
                <p className="text-sm text-slate-400">{session.user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 rounded-lg border border-red-500/30 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Access Token Section */}
        <div className="mb-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Figma Access Token</h2>
              <p className="text-sm text-slate-400">Use this token to authenticate API requests</p>
            </div>
            <button
              onClick={() => setShowToken(!showToken)}
              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-colors"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>

          {showToken && session.accessToken && (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto">
                {session.accessToken}
              </div>
              <button
                onClick={copyToken}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {tokenCopied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>




      </div>
    </div>
  );
}
