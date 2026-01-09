/**
 * Build context detection utilities for Next.js
 * Helps distinguish between build-time and runtime execution contexts
 */

export interface BuildContext {
  isBuildTime(): boolean;
  isRequestContext(): boolean;
}

export class BuildContextDetector implements BuildContext {
  /**
   * Detect if code is running during Next.js build process
   */
  isBuildTime(): boolean {
    // Check for build-time environment indicators
    if (typeof window !== 'undefined') {
      // We're in the browser, definitely not build time
      return false;
    }

    // Check for Next.js build environment variables
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      return true;
    }

    // Check for build-specific environment
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PHASE === 'phase-development-build') {
      return true;
    }

    // Additional build-time indicators
    if (process.env.npm_lifecycle_event === 'build' || process.env.npm_command === 'build') {
      return true;
    }

    return false;
  }

  /**
   * Detect if we're in a valid request context where Next.js APIs like cookies() are available
   */
  isRequestContext(): boolean {
    // If we're in build time, we definitely don't have request context
    if (this.isBuildTime()) {
      return false;
    }

    // If we're in the browser, we don't have server request context
    if (typeof window !== 'undefined') {
      return false;
    }

    // For now, assume we have request context if we're not in build time
    // The actual cookie access will determine if this is true
    return true;
  }

  /**
   * Check if cookies API is available in current context
   */
  canAccessCookies(): boolean {
    if (!this.isRequestContext()) {
      return false;
    }

    try {
      // Dynamic import to avoid issues during build
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nextHeaders = require('next/headers');
      
      // Try to call cookies() - this will throw if we're outside request scope
      nextHeaders.cookies();
      return true;
    } catch (error) {
      // If we get the "outside request scope" error, we know we can't access cookies
      if (error instanceof Error && error.message.includes('outside a request scope')) {
        return false;
      }
      // Other errors might indicate different issues
      return false;
    }
  }

  /**
   * Get current execution context information
   */
  getContextInfo(): {
    isBuildTime: boolean;
    isRequestContext: boolean;
    canAccessCookies: boolean;
    environment: string;
    phase?: string;
  } {
    return {
      isBuildTime: this.isBuildTime(),
      isRequestContext: this.isRequestContext(),
      canAccessCookies: this.canAccessCookies(),
      environment: process.env.NODE_ENV || 'unknown',
      phase: process.env.NEXT_PHASE,
    };
  }
}

// Export singleton instance
export const buildContext = new BuildContextDetector();

/**
 * Utility function to safely check if we're in build time
 */
export function isBuildTime(): boolean {
  return buildContext.isBuildTime();
}

/**
 * Utility function to safely check if we have request context
 */
export function isRequestContext(): boolean {
  return buildContext.isRequestContext();
}

/**
 * Utility function to safely check if cookies are accessible
 */
export function canAccessCookies(): boolean {
  return buildContext.canAccessCookies();
}

/**
 * Utility function to get full context information
 */
export function getContextInfo() {
  return buildContext.getContextInfo();
}