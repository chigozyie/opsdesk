'use client';

import { signInAction } from '@/lib/auth/actions';
import { useState, useTransition } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { Alert } from '@/components/alert';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <FormField
        label="Email address"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Enter your email"
      />

      <FormField
        label="Password"
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Enter your password"
      />

      {error && <Alert type="error">{error}</Alert>}

      <Button
        type="submit"
        loading={isPending}
        loadingText="Signing in..."
      >
        Sign in
      </Button>
    </form>
  );
}