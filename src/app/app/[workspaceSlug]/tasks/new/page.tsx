import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TaskForm } from '@/components/task-form';

interface NewTaskPageProps {
  params: {
    workspaceSlug: string;
  };
}

async function NewTaskContent({ params }: NewTaskPageProps) {
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

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/workspace/select');
  }

  // Check permissions
  if (membership.role === 'viewer') {
    redirect(`/app/${params.workspaceSlug}/tasks`);
  }

  // Get workspace members for assignment
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
    .eq('workspace_id', workspace.id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new task to track work and assign to team members.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <TaskForm
          workspaceId={workspace.id}
          workspaceSlug={params.workspaceSlug}
          mode="create"
          members={members || []}
        />
      </div>
    </div>
  );
}

export default function NewTaskPage(props: NewTaskPageProps) {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="bg-gray-200 rounded-lg h-96"></div>
        </div>
      </div>
    }>
      <NewTaskContent {...props} />
    </Suspense>
  );
}