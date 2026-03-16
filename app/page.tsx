'use client';

import { useEffect, useState } from 'react';
import ExternalBackendGenerator from './dashboard/components/ExternalBackendGenerator';

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

export default function Home() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Get backend configuration from environment variables
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8283';

  useEffect(() => {
    // Check for error params in URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const messageParam = params.get('message');

    if (errorParam) {
      setError(messageParam || errorParam);
      // Clear the URL params
      window.history.replaceState({}, '', '/');
    }

    // Check session status
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
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

  // Loading state
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

  // Authenticated view - Dashboard
  if (session?.authenticated) {
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

          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-400">External Backend Mode</p>
                <p className="text-sm text-blue-300 mt-1">
                  This dashboard uses the standalone Fastify backend service at <code className="bg-slate-700 px-1 rounded">{backendUrl}</code>.
                  Real-time progress updates are powered by Firebase.
                </p>
              </div>
            </div>
          </div>

          {/* Generator Component */}
          {session.accessToken && (
            <ExternalBackendGenerator
              initialUrl=""
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

  // Unauthenticated view - Landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Figma Generator</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/api/auth/figma"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
            >
              Sign In
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20 min-h-[calc(100vh-80px)]">
        {/* Error Alert */}
        {error && (
          <div className="mb-8 px-6 py-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 max-w-md text-center backdrop-blur-sm">
            <p className="font-medium">Authentication Error</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-purple-200 text-sm mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Powered by Figma API
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Figma to React{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Generator
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Transform your Figma designs into production-ready React code with AI-powered component generation.
            Sign in to get started.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/api/auth/figma"
              className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center gap-2 justify-center"
            >
              <svg className="w-6 h-6" viewBox="0 0 38 57" fill="none">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38H19V28.5Z" fill="currentColor" />
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V57H9.5C4.25329 57 0 52.7467 0 47.5Z" fill="currentColor" />
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="currentColor" />
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="currentColor" />
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="currentColor" />
              </svg>
              Sign in with Figma
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 w-full max-w-6xl mx-auto grid md:grid-cols-3 gap-6 px-6">
          <div className="p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Secure OAuth</h3>
            <p className="text-slate-400">Connect safely with Figma&apos;s official OAuth 2.0 flow. Your credentials are never stored.</p>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI-Powered</h3>
            <p className="text-slate-400">Advanced AI detects sections and generates clean, production-ready React components.</p>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Updates</h3>
            <p className="text-slate-400">Watch your components being generated in real-time with instant progress updates.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            Built with Next.js and the Figma API
          </p>
          <div className="flex items-center gap-6">
            <a href="https://www.figma.com/developers/api" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white text-sm transition-colors">
              Figma API Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
