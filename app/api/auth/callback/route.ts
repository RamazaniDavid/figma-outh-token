import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { exchangeCodeForToken } from '@/lib/auth';
import { FigmaClient } from '@/lib/figma-client';
import { SessionData } from '@/lib/types';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Verify state (CSRF protection)
  if (!state || state !== session.state) {
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
  }

  // Verify code exists
  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', request.url));
  }

  // Retrieve code_verifier
  const codeVerifier = session.codeVerifier;
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/?error=missing_verifier', request.url));
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code, codeVerifier);

    // Calculate expiration time
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

    // Store tokens in session
    session.accessToken = tokenResponse.access_token;
    session.refreshToken = tokenResponse.refresh_token;
    session.expiresAt = expiresAt;

    // Fetch user info
    const figmaClient = new FigmaClient(tokenResponse.access_token);
    const userInfo = await figmaClient.getMe();
    session.user = userInfo;

    // Clear PKCE data
    delete session.state;
    delete session.codeVerifier;

    await session.save();

    // Set temporary cookies for localStorage transfer
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('temp_access_token', tokenResponse.access_token, {
      httpOnly: false, // Allow JavaScript access
      maxAge: 10, // 10 seconds (just for transfer)
      sameSite: 'lax',
    });
    response.cookies.set('temp_refresh_token', tokenResponse.refresh_token, {
      httpOnly: false,
      maxAge: 10,
      sameSite: 'lax',
    });

    return response;

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
