import { NextResponse } from 'next/server';
import { getSession, generateState, buildAuthorizationUrl } from '@/lib/auth';

/**
 * GET /api/auth/figma
 * Initiates the Figma OAuth flow
 */
export async function GET() {
  try {
    console.log('[OAuth Init] Starting Figma OAuth flow');

    // Generate state for CSRF protection
    const state = generateState();
    console.log('[OAuth Init] Generated state:', { state, stateLength: state.length });

    // Store state in session for verification during callback
    const session = await getSession();
    session.oauthState = state;
    await session.save();
    console.log('[OAuth Init] State stored in session');

    // Build and redirect to Figma authorization URL
    const authUrl = buildAuthorizationUrl(state);
    console.log('[OAuth Init] Redirecting to Figma authorization URL:', authUrl);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[OAuth Init] OAuth initiation error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Redirect to home with error
    const errorUrl = new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000');
    errorUrl.searchParams.set('error', 'oauth_init_failed');
    errorUrl.searchParams.set('message', errorMessage);

    return NextResponse.redirect(errorUrl);
  }
}
