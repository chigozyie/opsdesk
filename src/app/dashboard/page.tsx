import { requireAuth } from '@/lib/auth/server';
import { SignOutButton } from './sign-out-button';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">BizDesk Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome to BizDesk
            </h2>
            <p className="text-gray-600">
              You have successfully signed in to your business management dashboard.
              This is a placeholder page that will be replaced with the actual dashboard
              in future tasks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}