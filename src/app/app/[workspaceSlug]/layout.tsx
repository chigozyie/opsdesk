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
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">BizDesk</h1>
              <div className="hidden sm:block">
                <WorkspaceSelector 
                  workspaces={userWorkspaces} 
                  currentWorkspaceSlug={params.workspaceSlug}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-700">Welcome, {user.email}</span>
              <span className="sm:hidden text-sm text-gray-700">{user.email?.split('@')[0]}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Workspace Selector */}
      <div className="sm:hidden bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4">
          <div className="py-3">
            <WorkspaceSelector 
              workspaces={userWorkspaces} 
              currentWorkspaceSlug={params.workspaceSlug}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}