import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTasks } from '@/lib/server-actions/task-actions';
import { TaskList } from '@/components/task-list';
import { TaskFilters } from '@/components/task-filters';

interface TasksPageProps {
  params: {
    workspaceSlug: string;
  };
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    assigned_to?: string;
    created_by?: string;
  };
}

async function TasksContent({ params, searchParams }: TasksPageProps) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get workspace and user role
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', params.workspaceSlug)
    .single();

  if (!workspace) {
    redirect('/workspace/select');
  }

  // TypeScript doesn't understand that workspace is non-null after the check above
  const workspaceData = workspace as { id: string; name: string };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceData.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/workspace/select');
  }

  // TypeScript doesn't understand that membership is non-null after the check above
  const membershipData = membership as { role: string };

  // Get workspace members for filtering
  const { data: members } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      users:user_id (
        id,
        email
      )
    `)
    .eq('workspace_id', workspaceData.id);

  // Parse search params
  const page = parseInt(searchParams.page || '1', 10);
  const search = searchParams.search || '';
  const status = searchParams.status as 'pending' | 'in_progress' | 'completed' | undefined;
  const assigned_to = searchParams.assigned_to || '';
  const created_by = searchParams.created_by || '';

  // Get tasks
  const result = await getTasks({
    workspace_id: workspaceData.id,
    page,
    limit: 20,
    search: search || undefined,
    status,
    assigned_to: assigned_to || undefined,
    created_by: created_by || undefined,
  });

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch tasks');
  }

  const { tasks, total, hasMore } = result.data!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track tasks for your team
          </p>
        </div>
        {(membershipData.role === 'admin' || membershipData.role === 'member') && (
          <Link
            href={`/app/${params.workspaceSlug}/tasks/new` as any}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Task
          </Link>
        )}
      </div>

      {/* Filters */}
      <TaskFilters
        workspaceSlug={params.workspaceSlug}
        members={members || []}
        currentFilters={{
          search,
          status,
          assigned_to,
          created_by,
        }}
      />

      {/* Task List */}
      <TaskList
        tasks={tasks}
        workspaceSlug={params.workspaceSlug}
        userRole={membershipData.role as 'admin' | 'member' | 'viewer'}
        currentPage={page}
        totalTasks={total}
        hasMore={hasMore}
        members={members || []}
      />
    </div>
  );
}

export default function TasksPage(props: TasksPageProps) {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <TasksContent {...props} />
    </Suspense>
  );
}