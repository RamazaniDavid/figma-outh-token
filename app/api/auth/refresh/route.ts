import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { refreshAccessToken } from '@/lib/auth';
import { SessionData } from '@/lib/types';

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const tokenResponse = await refreshAccessToken(session.refreshToken);

    // Update session with new tokens
    session.accessToken = tokenResponse.access_token;
    session.refreshToken = tokenResponse.refresh_token;
    session.expiresAt = Date.now() + tokenResponse.expires_in * 1000;

    await session.save();

    return NextResponse.json({
      success: true,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: session.expiresAt
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    // Clear session on refresh failure
    session.destroy();

    return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
  }
}
