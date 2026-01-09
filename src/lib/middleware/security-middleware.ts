import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/services/security-service';

/**
 * Security middleware for rate limiting and request validation
 */
export async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  try {
    // Get client IP address
    const clientIP = request.ip || 
                    request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);

    // Rate limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const rateLimitKey = `${clientIP}:${request.nextUrl.pathname}`;
      
      // Simple in-memory rate limiting (in production, use Redis or similar)
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const maxRequests = 100; // 100 requests per minute
      
      // This is a simplified rate limiter - in production use a proper solution
      const requestLog = global.requestLog || new Map();
      global.requestLog = requestLog;
      
      const userRequests = requestLog.get(rateLimitKey) || [];
      const recentRequests = userRequests.filter((time: number) => now - time < windowMs);
      
      if (recentRequests.length >= maxRequests) {
        return new NextResponse('Rate limit exceeded', { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((now + windowMs) / 1000).toString(),
          }
        });
      }
      
      recentRequests.push(now);
      requestLog.set(rateLimitKey, recentRequests);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (maxRequests - recentRequests.length).toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());
    }

    // Validate request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return new NextResponse('Request too large', { status: 413 });
    }

    // Log suspicious requests
    const userAgent = request.headers.get('user-agent') || '';
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /nessus/i,
      /openvas/i,
      /burp/i,
      /owasp/i,
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      console.warn('Suspicious user agent detected:', {
        ip: clientIP,
        userAgent,
        url: request.nextUrl.toString(),
        timestamp: new Date().toISOString(),
      });
    }

    return response;
  } catch (error) {
    console.error('Security middleware error:', error);
    return NextResponse.next();
  }
}

/**
 * Enhanced server action security wrapper
 */
export function withSecurity<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: {
    rateLimitKey?: string;
    maxAttempts?: number;
    windowMinutes?: number;
    requireAuth?: boolean;
    sanitizeInput?: boolean;
  } = {}
) {
  return async (...args: T): Promise<R> => {
    try {
      // Sanitize input if requested
      if (options.sanitizeInput) {
        args = args.map(arg => securityService.sanitizeInput(arg)) as T;
      }

      // Validate SQL parameters
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null) {
          if (!securityService.validateSqlParams(arg)) {
            throw new Error('Invalid input parameters detected');
          }
        }
      }

      // Execute the original action
      return await action(...args);
    } catch (error) {
      // Log security-related errors
      if (error instanceof Error && 
          (error.message.includes('injection') || 
           error.message.includes('Invalid input') ||
           error.message.includes('Rate limit'))) {
        console.warn('Security-related error in server action:', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  };
}

// Declare global type for request log
declare global {
  var requestLog: Map<string, number[]> | undefined;
}