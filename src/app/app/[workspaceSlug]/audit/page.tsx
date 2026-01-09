import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuditLogsList } from '@/components/audit-logs-list';
import { AuditStatsCards } from '@/components/audit-stats-cards';

interface AuditPageProps {
  params: {
    workspaceSlug: string;
  };
  searchParams: {
    resourceType?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  };
}

export default async function AuditPage({ params, searchParams }: AuditPageProps) {
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

  const workspaceData = workspace as any;
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

      {/* Audit Statistics */}
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded-lg" />}>
        <AuditStatsCards workspaceSlug={params.workspaceSlug} />
      </Suspense>

      {/* Audit Logs */}
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg" />}>
        <AuditLogsList 
          workspaceSlug={params.workspaceSlug}
          filters={searchParams}
        />
      </Suspense>
    </div>
  );
}