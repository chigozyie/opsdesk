import { updateSession } from '@/lib/supabase/middleware';
import { securityMiddleware } from '@/lib/middleware/security-middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Apply security middleware first
  const securityResponse = await securityMiddleware(request);
  
  // If security middleware returns a response (e.g., rate limit exceeded), return it
  if (securityResponse.status !== 200) {
    return securityResponse;
  }

  // Apply Supabase session middleware
  const sessionResponse = await updateSession(request);
  
  // Merge security headers with session response
  if (sessionResponse) {
    // Copy security headers to the session response
    securityResponse.headers.forEach((value, key) => {
      sessionResponse.headers.set(key, value);
    });
    return sessionResponse;
  }

  return securityResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
