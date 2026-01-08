'use client';

import { signOutAction } from '@/lib/auth/actions';
import { useTransition } from 'react';
import { Button } from '@/components/button';

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <Button
      variant="danger"
      onClick={handleSignOut}
      loading={isPending}
      loadingText="Signing out..."
      className="w-auto"
    >
      Sign out
    </Button>
  );
}