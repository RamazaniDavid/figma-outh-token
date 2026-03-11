import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { generateState, generatePKCE, buildAuthorizationUrl } from '@/lib/auth';
import { SessionData } from '@/lib/types';

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  // Generate CSRF state and PKCE
  const state = generateState();
  const { codeVerifier, codeChallenge } = generatePKCE();

  // Store in session temporarily
  session.state = state;
  session.codeVerifier = codeVerifier;
  await session.save();

  // Build authorization URL
  const authUrl = buildAuthorizationUrl(state, codeChallenge);

  // Redirect to Figma OAuth
  return NextResponse.redirect(authUrl);
}
