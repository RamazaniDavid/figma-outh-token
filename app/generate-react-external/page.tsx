/**
 * External Backend React Project Generation Page
 *
 * This page provides a dedicated interface for generating React projects
 * from Figma URLs using the standalone Fastify backend service.
 *
 * Route: /generate-react-external
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ExternalBackendGenerator from '../dashboard/components/ExternalBackendGenerator';

interface SessionData {
  authenticated: boolean;
  accessToken?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

function GenerateReactExternalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get backend configuration from environment variables
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8283';

  // Get URL from query params (e.g., /generate-react-external?url=...)
  const urlParam = searchParams.get('url') || '';

  // Check authentication status
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSession(data);
        if (!data.authenticated) {
          router.push('/');
        }
      })
      .catch(() => {
        router.push('/');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

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
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">External Backend Generator</h1>
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                  Beta
                </span>
              </div>
              <p className="text-sm text-slate-400">Standalone Fastify backend service</p>
            </div>
          </div>
          {session.user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">{session.user.email}</span>
              {session.user.avatar && (
                <img
                  src={session.user.avatar}
                  alt={session.user.name}
                  className="w-8 h-8 rounded-full border-2 border-slate-700"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-400">External Backend Mode</p>
              <p className="text-sm text-blue-300 mt-1">
                This page uses the standalone Fastify backend service at <code className="bg-slate-700 px-1 rounded">{backendUrl}</code>.
                Backend configuration is set via environment variables (<code className="bg-slate-700 px-1 rounded">NEXT_PUBLIC_BACKEND_URL</code>, <code className="bg-slate-700 px-1 rounded">NEXT_PUBLIC_BACKEND_API_KEY</code>).
              </p>
            </div>
          </div>
        </div>

        {/* Generator Component */}
        {session.accessToken && (
          <ExternalBackendGenerator
            initialUrl={urlParam}
            figmaToken={session.accessToken}
            onComplete={handleComplete}
            onError={handleError}
            domainId="12702"
          />
        )}
      </div>
    </div>
  );
}

export default function GenerateReactExternalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    }>
      <GenerateReactExternalContent />
    </Suspense>
  );
}
