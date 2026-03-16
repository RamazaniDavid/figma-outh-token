'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface SessionData {
  authenticated: boolean;
  user?: User;
  expiresAt?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {session.user?.avatar && (
                <img
                  src={session.user.avatar}
                  alt={session.user.name}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {session.user?.name}
                </h1>
                <p className="text-gray-600">{session.user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Figma to React Generator
          </h2>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Generate React Project
              </h3>
              <p className="text-gray-600 mb-4">
                Convert your Figma designs into production-ready React code using our external backend generator.
              </p>
              <Link
                href="/generate-react-external"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start Generation
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How it works
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Paste your Figma URL</li>
                <li>Our AI analyzes your design and detects sections</li>
                <li>React components are generated with Tailwind CSS</li>
                <li>Download your complete React project</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
