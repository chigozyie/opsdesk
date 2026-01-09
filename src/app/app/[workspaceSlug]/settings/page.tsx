import { requireAuth } from '@/lib/auth/server';
import { getWorkspaceBySlug, getWorkspaceMembers } from '@/lib/workspace/actions';
import { MemberInviteForm } from '@/components/member-invite-form';
import { MemberList } from '@/components/member-list';
import { notFound, redirect } from 'next/navigation';

interface SettingsPageProps {
  params: {
    workspaceSlug: string;
  };
}

export default async function WorkspaceSettingsPage({ params }: SettingsPageProps) {
  await requireAuth();
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  
  if (!workspace) {
    notFound();
  }

  // Only admins can access settings
  if (workspace.role !== 'admin') {
    redirect(`/app/${params.workspaceSlug}/dashboard`);
  }

  const members = await getWorkspaceMembers(workspace.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
        <p className="text-gray-600">
          Manage your workspace settings and team members.
        </p>
      </div>

      {/* Workspace Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Workspace Information
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{workspace.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">URL Slug</dt>
              <dd className="mt-1 text-sm text-gray-900">/{workspace.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(workspace.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Members</dt>
              <dd className="mt-1 text-sm text-gray-900">{members.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Member Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invite New Member */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Invite Member
              </h3>
              <MemberInviteForm 
                workspaceId={workspace.id}
                currentUserRole={workspace.role}
                onSuccess={() => {
                  // In a real app, you'd refresh the member list
                  // For now, we'll just show a success message
                }}
              />
            </div>
          </div>
        </div>

        {/* Member List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Team Members ({members.length})
              </h3>
              <MemberList
                members={members}
                workspaceId={workspace.id}
                currentUserRole={workspace.role}
                onMemberUpdate={() => {
                  // In a real app, you'd refresh the member list
                  // For now, we'll just show a success message
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white shadow rounded-lg border border-red-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-red-900 mb-4">
            Danger Zone
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            These actions are irreversible. Please be careful.
          </p>
          <button
            type="button"
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            disabled
          >
            Delete Workspace (Not Implemented)
          </button>
        </div>
      </div>
    </div>
  );
}