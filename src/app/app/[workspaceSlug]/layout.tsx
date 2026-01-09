import { requireAuth } from '@/lib/auth/server';
import { getWorkspaceBySlug, getUserWorkspaces } from '@/lib/workspace/actions';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { SignOutButton } from '@/app/dashboard/sign-out-button';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: {
    workspaceSlug: string;
  };
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const user = await requireAuth();
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  
  if (!workspace) {
    notFound();
  }

  const userWorkspaces = await getUserWorkspaces();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">BizDesk</h1>
              <WorkspaceSelector 
                workspaces={userWorkspaces} 
                currentWorkspaceSlug={params.workspaceSlug}
              />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <Link
              href={`/app/${params.workspaceSlug}/dashboard`}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Dashboard
            </Link>
            <Link
              href={`/app/${params.workspaceSlug}/customers` as any}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Customers
            </Link>
            <Link
              href={`/app/${params.workspaceSlug}/invoices` as any}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Invoices
            </Link>
            <Link
              href={`/app/${params.workspaceSlug}/expenses` as any}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Expenses
            </Link>
            <Link
              href={`/app/${params.workspaceSlug}/tasks` as any}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Tasks
            </Link>
            {workspace.role === 'admin' && (
              <Link
                href={`/app/${params.workspaceSlug}/settings`}
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Settings
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}