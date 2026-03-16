import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { SessionData } from './types';

// Session configuration
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'figma_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

// Default session values
export const defaultSession: SessionData = {
  accessToken: undefined,
  refreshToken: undefined,
  expiresAt: undefined,
  userId: undefined,
  userName: undefined,
  userEmail: undefined,
  userAvatar: undefined,
  oauthState: undefined,
};

/**
 * Get the current session from cookies
 */
export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

/**
 * Check if the current session has a valid access token
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();

  console.log('[Auth] Checking authentication:', {
    hasAccessToken: !!session.accessToken,
    expiresAt: session.expiresAt,
    now: Date.now(),
    isExpired: session.expiresAt ? Date.now() > session.expiresAt : null,
  });

  if (!session.accessToken) {
    console.log('[Auth] No access token found');
    return false;
  }

  // Check if token is expired
  if (session.expiresAt && Date.now() > session.expiresAt) {
    console.log('[Auth] Token is expired');
    return false;
  }

  console.log('[Auth] Session is valid');
  return true;
}

/**
 * Clear the current session
 */
export async function clearSession() {
  const session = await getSession();
  session.accessToken = undefined;
  session.refreshToken = undefined;
  session.expiresAt = undefined;
  session.userId = undefined;
  session.userName = undefined;
  session.userEmail = undefined;
  session.userAvatar = undefined;
  session.oauthState = undefined;
  await session.save();
}

/**
 * Generate a random state parameter for OAuth CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Figma OAuth URLs
 */
export const FIGMA_OAUTH = {
  authorizationUrl: 'https://www.figma.com/oauth',
  tokenUrl: 'https://api.figma.com/v1/oauth/token',
  revokeUrl: 'https://api.figma.com/v1/oauth/revoke',
  scopes: ['current_user:read', 'file_content:read', 'file_metadata:read','library_assets:read','library_content:read'],
};

/**
 * Build the Figma OAuth authorization URL
 */
export function buildAuthorizationUrl(state: string): string {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;

  console.log('[Auth] Building authorization URL:', {
    clientId,
    redirectUri,
    scopes: FIGMA_OAUTH.scopes,
    scopesString: FIGMA_OAUTH.scopes.join(','),
    state,
  });

  if (!clientId) {
    throw new Error('FIGMA_CLIENT_ID environment variable is not set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: FIGMA_OAUTH.scopes.join(','),
    state: state,
    response_type: 'code',
  });

  const authUrl = `${FIGMA_OAUTH.authorizationUrl}?${params.toString()}`;
  console.log('[Auth] Authorization URL built:', authUrl);

  return authUrl;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  grantedScopes?: string;
}> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;

  console.log('[Auth] Exchanging code for token:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    redirectUri,
    codeLength: code?.length,
  });

  if (!clientId || !clientSecret) {
    throw new Error('FIGMA_CLIENT_ID or FIGMA_CLIENT_SECRET environment variable is not set');
  }

  const requestBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: code,
    grant_type: 'authorization_code',
  });

  console.log('[Auth] Sending token exchange request to:', FIGMA_OAUTH.tokenUrl);

  const response = await fetch(FIGMA_OAUTH.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  });

  console.log('[Auth] Token exchange response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Auth] Token exchange failed:', {
      status: response.status,
      error,
    });
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  const data = await response.json();
  console.log('[Auth] Token exchange successful:', {
    hasAccessToken: !!data.access_token,
    hasRefreshToken: !!data.refresh_token,
    expiresIn: data.expires_in,
    scopes: data.scope,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    grantedScopes: data.scope,
  };
}

/**
 * Refresh the access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;

  console.log('[Auth] Refreshing access token:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    hasRefreshToken: !!refreshToken,
    refreshTokenLength: refreshToken?.length,
  });

  if (!clientId || !clientSecret) {
    throw new Error('FIGMA_CLIENT_ID or FIGMA_CLIENT_SECRET environment variable is not set');
  }

  const response = await fetch(FIGMA_OAUTH.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  console.log('[Auth] Token refresh response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Auth] Token refresh failed:', {
      status: response.status,
      error,
    });
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  console.log('[Auth] Token refresh successful:', {
    hasAccessToken: !!data.access_token,
    hasRefreshToken: !!data.refresh_token,
    expiresIn: data.expires_in,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}
