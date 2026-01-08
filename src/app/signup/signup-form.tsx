'use client';

import { signUpAction } from '@/lib/auth/actions';
import { useState, useTransition } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { Alert } from '@/components/alert';

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
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
        autoComplete="new-password"
        required
        placeholder="Enter your password"
      />

      <FormField
        label="Confirm Password"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        placeholder="Confirm your password"
      />

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <Button
        type="submit"
        loading={isPending}
        loadingText="Creating account..."
      >
        Create account
      </Button>
    </form>
  );
}