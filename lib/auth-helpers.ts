/**
 * Authentication Helper Functions
 *
 * Supports dual authentication:
 * 1. Header-based (Authorization: Bearer token or X-Figma-Access-Token)
 * 2. Session-based (encrypted cookie)
 */

import { NextRequest } from 'next/server';
import { getSession, refreshAccessToken } from './auth';

export interface AuthResult {
  accessToken: string;
  source: 'header' | 'session';
  userId?: string;
  userEmail?: string;
}

/**
 * Extract Figma access token from request
 *
 * Priority order:
 * 1. Authorization: Bearer <token>
 * 2. X-Figma-Access-Token: <token>
 * 3. Session cookie (encrypted)
 *
 * @param request - NextRequest object
 * @returns AuthResult with token and metadata
 * @throws Error if no valid token found
 */
export async function getAccessToken(request: NextRequest): Promise<AuthResult> {
  // ============================================================
  // OPTION 1: Authorization Header (Bearer Token)
  // ============================================================
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (token && token.length > 0) {
      console.log('[Auth] Using Bearer token from Authorization header');
      return {
        accessToken: token,
        source: 'header',
      };
    }
  }

  // ============================================================
  // OPTION 2: Custom Header (X-Figma-Access-Token)
  // ============================================================
  const customHeader = request.headers.get('x-figma-access-token');
  if (customHeader && customHeader.length > 0) {
    console.log('[Auth] Using token from X-Figma-Access-Token header');
    return {
      accessToken: customHeader,
      source: 'header',
    };
  }

  // ============================================================
  // OPTION 3: Session Cookie (Existing Behavior)
  // ============================================================
  try {
    const session = await getSession();

    if (!session.accessToken) {
      throw new Error('No access token found in session or headers');
    }

    let accessToken = session.accessToken;

    // Check if token is about to expire (within 5 minutes)
    if (session.expiresAt && Date.now() > session.expiresAt - 5 * 60 * 1000) {
      if (session.refreshToken) {
        console.log('[Auth] Session token expiring soon, refreshing...');

        try {
          const tokens = await refreshAccessToken(session.refreshToken);
          session.accessToken = tokens.accessToken;
          session.refreshToken = tokens.refreshToken;
          session.expiresAt = Date.now() + tokens.expiresIn * 1000;
          await session.save();
          accessToken = tokens.accessToken;

          console.log('[Auth] Session token refreshed successfully');
        } catch (refreshError) {
          console.error('[Auth] Token refresh failed:', refreshError);
          throw new Error('Session expired. Please re-authenticate.');
        }
      }
    }

    console.log('[Auth] Using token from session cookie');
    return {
      accessToken,
      source: 'session',
      userId: session.userId,
      userEmail: session.userEmail,
    };
  } catch (error) {
    throw new Error('Authentication required. Provide token via Authorization header or session.');
  }
}

/**
 * Validate that request has valid authentication
 *
 * @param request - NextRequest object
 * @returns true if authenticated, false otherwise
 */
export async function isRequestAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    await getAccessToken(request);
    return true;
  } catch {
    return false;
  }
}
