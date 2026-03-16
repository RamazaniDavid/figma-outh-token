import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Clears the session and logs out the user
 */
export async function POST() {
  try {
    await clearSession();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/logout
 * Alternative logout that redirects to home
 */
export async function GET() {
  try {
    await clearSession();
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL('/', baseUrl));
  } catch (error) {
    console.error('Logout error:', error);
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL('/?error=logout_failed', baseUrl));
  }
}
