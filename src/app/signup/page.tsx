import { requireNoAuth } from '@/lib/auth/server';
import { SignUpForm } from './signup-form';
import { AuthLayout } from '@/components/auth-layout';

export default async function SignUpPage() {
  await requireNoAuth();

  return (
    <AuthLayout
      title="Create your account"
      description={
        <>
          Or{' '}
          <a
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            sign in to your existing account
          </a>
        </>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}