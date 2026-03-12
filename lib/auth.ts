import crypto from 'crypto';
import { FigmaTokenResponse } from './types';

const FIGMA_AUTH_URL = 'https://www.figma.com/oauth';
const FIGMA_TOKEN_URL = 'https://api.figma.com/v1/oauth/token';

const SCOPES = [
  'current_user:read',
  'file_content:read',
  'file_metadata:read',
  'library_assets:read',
  'library_content:read',
];

/**
 * Generate random state for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);

  return { codeVerifier, codeChallenge };
}

/**
 * Get redirect URI - auto-detects from environment or uses configured value
 */
export function getRedirectUri(baseUrl?: string): string {
  // If FIGMA_REDIRECT_URI is explicitly set, use it
  if (process.env.FIGMA_REDIRECT_URI) {
    return process.env.FIGMA_REDIRECT_URI;
  }

  // Otherwise, auto-detect from the request URL
  if (baseUrl) {
    return `${baseUrl}/api/auth/callback`;
  }

  // Fallback to NEXTAUTH_URL or localhost
  const fallbackBase = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${fallbackBase}/api/auth/callback`;
}

/**
 * Build Figma authorization URL
 */
export function buildAuthorizationUrl(state: string, codeChallenge: string, baseUrl?: string): string {
  const redirectUri = getRedirectUri(baseUrl);

  const params = new URLSearchParams({
    client_id: process.env.FIGMA_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    state,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${FIGMA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  baseUrl?: string
): Promise<FigmaTokenResponse> {
  const redirectUri = getRedirectUri(baseUrl);

  const response = await fetch(FIGMA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.FIGMA_CLIENT_ID!,
      client_secret: process.env.FIGMA_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<FigmaTokenResponse> {
  const response = await fetch(FIGMA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.FIGMA_CLIENT_ID!,
      client_secret: process.env.FIGMA_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return await response.json();
}

/**
 * Base64 URL encoding helper
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
