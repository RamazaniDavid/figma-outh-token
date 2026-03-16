import { NextResponse } from 'next/server';
import { getSession, isAuthenticated } from '@/lib/auth';

/**
 * GET /api/auth/session
 * Returns the current session status and user info
 */
export async function GET() {
  try {
    console.log('[Session] Checking session status');
    const authenticated = await isAuthenticated();
    console.log('[Session] Authentication status:', { authenticated });

    if (!authenticated) {
      console.log('[Session] User not authenticated');
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    const session = await getSession();
    console.log('[Session] User authenticated:', {
      userId: session.userId,
      userName: session.userName,
      userEmail: session.userEmail,
      hasAvatar: !!session.userAvatar,
      hasAccessToken: !!session.accessToken,
      expiresAt: session.expiresAt,
    });

    return NextResponse.json({
      authenticated: true,
      accessToken: session.accessToken, // Include access token for header-based auth
      user: {
        id: session.userId,
        name: session.userName,
        email: session.userEmail,
        avatar: session.userAvatar,
      },
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('[Session] Session check error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: 'Failed to check session',
      },
      { status: 500 }
    );
  }
}
