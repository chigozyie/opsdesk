import { requireAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface AuditPageProps {
  params: {
    workspaceSlug: string;
  };
}

export default async function AuditPage({ params }: AuditPageProps) {
  // Require authentication
  const user = await requireAuth();
  
  // Get workspace and verify admin access
  const supabase = createClient();
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select(`
      id,
      slug,
      name,
      workspace_members!inner (
        role
      )
    `)
    .eq('slug', params.workspaceSlug)
    .eq('workspace_members.user_id', user.id)
    .single();

  if (error || !workspace) {
    redirect('/dashboard');
  }

  const workspaceData = workspace as {
    id: string;
    slug: string;
    name: string;
    workspace_members: Array<{ role: string }>;
  };
  const userRole = workspaceData.workspace_members[0]?.role;

  // Only admins can view audit logs
  if (userRole !== 'admin') {
    redirect(`/app/${params.workspaceSlug}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="text-gray-600">
          View and monitor all activities within your workspace for security and compliance.
        </p>
      </div>

      <div className="bg-white p-8 rounded-lg border text-center">
        <h2 className="text-xl font-semibold mb-4">Audit System Temporarily Unavailable</h2>
        <p className="text-gray-600 mb-4">
          The audit logging system is currently being updated to improve performance and reliability.
        </p>
        <p className="text-sm text-gray-500">
          This feature will be restored in a future update.
        </p>
      </div>
    </div>
  );
}