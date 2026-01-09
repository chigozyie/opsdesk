import { requireAuth } from '@/lib/auth/server';
import { getUserWorkspaces } from '@/lib/workspace/actions';
import { AuthLayout } from '@/components/auth-layout';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SelectWorkspacePage() {
  await requireAuth();
  const workspaces = await getUserWorkspaces();

  // If user has no workspaces, redirect to create one
  if (workspaces.length === 0) {
    redirect('/workspace/create');
  }

  // If user has only one workspace, redirect to it
  if (workspaces.length === 1 && workspaces[0]) {
    redirect(`/app/${workspaces[0].slug}/dashboard`);
  }

  return (
    <AuthLayout
      title="Select Workspace"
      description="Choose which workspace you'd like to access."
    >
      <div className="space-y-3">
        {workspaces.map((workspace) => (
          <Link
            key={workspace.id}
            href={`/app/${workspace.slug}/dashboard`}
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{workspace.name}</h3>
                <p className="text-sm text-gray-500">/{workspace.slug}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                workspace.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800'
                  : workspace.role === 'member'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {workspace.role}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/workspace/create"
          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
        >
          + Create New Workspace
        </Link>
      </div>
    </AuthLayout>
  );
}