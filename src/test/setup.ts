// Test setup file for vitest
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

// Clean up after tests
afterEach(() => {
  // Reset any global state if needed
});

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.DEBUG_TESTS ? console.log : () => {},
  warn: console.warn,
  error: console.error,
};