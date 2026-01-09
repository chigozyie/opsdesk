/**
 * Safe cookie access wrapper for Next.js
 * Handles cases where cookies() is called outside request scope
 */

import { canAccessCookies, isBuildTime } from './build-context';

export interface SafeCookieStore {
  getAll(): Array<{ name: string; value: string }>;
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string, options?: any): void;
}

export class SafeCookieWrapper implements SafeCookieStore {
  private fallbackCookies: Map<string, string> = new Map();

  /**
   * Get all cookies safely
   */
  getAll(): Array<{ name: string; value: string }> {
    if (canAccessCookies()) {
      try {
        // Dynamic import to avoid build-time issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nextHeaders = require('next/headers');
        return nextHeaders.cookies().getAll();
      } catch (error) {
        console.warn('Failed to access cookies, using fallback:', error);
      }
    }

    // Return empty array during build time or when cookies are not accessible
    return Array.from(this.fallbackCookies.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  /**
   * Get a specific cookie safely
   */
  get(name: string): { name: string; value: string } | undefined {
    if (canAccessCookies()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nextHeaders = require('next/headers');
        return nextHeaders.cookies().get(name);
      } catch (error) {
        console.warn(`Failed to access cookie '${name}', using fallback:`, error);
      }
    }

    // Return fallback value or undefined
    const value = this.fallbackCookies.get(name);
    return value ? { name, value } : undefined;
  }

  /**
   * Set a cookie safely
   */
  set(name: string, value: string, options?: any): void {
    if (canAccessCookies()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nextHeaders = require('next/headers');
        nextHeaders.cookies().set(name, value, options);
        return;
      } catch (error) {
        console.warn(`Failed to set cookie '${name}', using fallback:`, error);
      }
    }

    // Store in fallback during build time
    this.fallbackCookies.set(name, value);
  }

  /**
   * Check if a cookie exists
   */
  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  /**
   * Delete a cookie safely
   */
  delete(name: string): void {
    if (canAccessCookies()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nextHeaders = require('next/headers');
        nextHeaders.cookies().delete(name);
        return;
      } catch (error) {
        console.warn(`Failed to delete cookie '${name}', using fallback:`, error);
      }
    }

    // Remove from fallback
    this.fallbackCookies.delete(name);
  }

  /**
   * Clear all fallback cookies (useful for testing)
   */
  clearFallback(): void {
    this.fallbackCookies.clear();
  }
}

// Export singleton instance
export const safeCookies = new SafeCookieWrapper();

/**
 * Get a safe cookie store that handles build-time and runtime contexts
 */
export function getSafeCookieStore(): SafeCookieStore {
  return safeCookies;
}

/**
 * Utility function to safely get all cookies
 */
export function getAllCookies(): Array<{ name: string; value: string }> {
  return safeCookies.getAll();
}

/**
 * Utility function to safely get a specific cookie
 */
export function getCookie(name: string): { name: string; value: string } | undefined {
  return safeCookies.get(name);
}

/**
 * Utility function to safely set a cookie
 */
export function setCookie(name: string, value: string, options?: any): void {
  safeCookies.set(name, value, options);
}

/**
 * Create a cookie store adapter for Supabase client
 */
export function createSafeCookieAdapter() {
  return {
    getAll(): Array<{ name: string; value: string }> {
      return getAllCookies();
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>): void {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options);
        });
      } catch (error) {
        // Ignore cookie setting errors during build time
        if (!isBuildTime()) {
          console.warn('Failed to set cookies:', error);
        }
      }
    },
  };
}