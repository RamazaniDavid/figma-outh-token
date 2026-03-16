import { NextRequest, NextResponse } from 'next/server';
import { getSession, exchangeCodeForToken } from '@/lib/auth';
import { FigmaClient } from '@/lib/figma-client';

/**
 * GET /api/auth/callback
 * Handles the OAuth callback from Figma
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  console.log('[OAuth Callback] Received callback:', {
    hasCode: !!code,
    codeLength: code?.length,
    hasState: !!state,
    state,
    error,
    errorDescription,
  });

  // Handle OAuth errors from Figma
  if (error) {
    console.error('[OAuth Callback] OAuth error from Figma:', error, errorDescription);
    const errorUrl = new URL('/', baseUrl);
    errorUrl.searchParams.set('error', error);
    if (errorDescription) {
      errorUrl.searchParams.set('message', errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('[OAuth Callback] Missing required parameters:', { hasCode: !!code, hasState: !!state });
    const errorUrl = new URL('/', baseUrl);
    errorUrl.searchParams.set('error', 'missing_params');
    errorUrl.searchParams.set('message', 'Missing authorization code or state');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Get session and verify state
    const session = await getSession();
    console.log('[OAuth Callback] Session state verification:', {
      sessionState: session.oauthState,
      receivedState: state,
      matches: session.oauthState === state,
    });

    if (session.oauthState !== state) {
      console.error('[OAuth Callback] State mismatch:', { expected: session.oauthState, received: state });
      const errorUrl = new URL('/', baseUrl);
      errorUrl.searchParams.set('error', 'state_mismatch');
      errorUrl.searchParams.set('message', 'Invalid state parameter. Please try again.');
      return NextResponse.redirect(errorUrl);
    }

    // Clear the state from session
    session.oauthState = undefined;

    // Exchange code for tokens
    console.log('[OAuth Callback] Exchanging code for tokens...');
    const tokens = await exchangeCodeForToken(code);
    console.log('[OAuth Callback] Token exchange successful:', {
      hasAccessToken: !!tokens.accessToken,
      accessTokenLength: tokens.accessToken?.length,
      hasRefreshToken: !!tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    // Store tokens in session
    session.accessToken = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.expiresAt = Date.now() + tokens.expiresIn * 1000;
    session.grantedScopes = tokens.grantedScopes;

    // Try to fetch user info from Figma (optional - may require additional scope)
    try {
      console.log('[OAuth Callback] Fetching user info from Figma...');
      const figmaClient = new FigmaClient(tokens.accessToken);
      const user = await figmaClient.getMe();

      console.log('[OAuth Callback] User info fetched successfully:', {
        userId: user.id,
        userName: user.handle,
        userEmail: user.email,
        hasAvatar: !!user.img_url,
      });

      session.userId = user.id;
      session.userName = user.handle;
      session.userEmail = user.email;
      session.userAvatar = user.img_url;
    } catch (userError) {
      // User info fetch failed - continue without it
      console.error('[OAuth Callback] Could not fetch user info (may need additional scope):', {
        error: userError instanceof Error ? userError.message : userError,
        stack: userError instanceof Error ? userError.stack : undefined,
      });
      session.userName = 'Figma User';
    }

    // Save session
    await session.save();
    console.log('[OAuth Callback] Session saved successfully');

    // Redirect to dashboard
    console.log('[OAuth Callback] Redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', baseUrl));
  } catch (error) {
    console.error('[OAuth Callback] OAuth callback error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorUrl = new URL('/', baseUrl);
    errorUrl.searchParams.set('error', 'oauth_callback_failed');
    errorUrl.searchParams.set('message', errorMessage);

    return NextResponse.redirect(errorUrl);
  }
}
