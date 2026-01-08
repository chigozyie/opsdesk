import { requireNoAuth } from '@/lib/auth/server';
import { LoginForm } from './login-form';
import { AuthLayout } from '@/components/auth-layout';

export default async function LoginPage() {
  await requireNoAuth();

  return (
    <AuthLayout
      title="Sign in to BizDesk"
      description={
        <>
          Or{' '}
          <a
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            create a new account
          </a>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}