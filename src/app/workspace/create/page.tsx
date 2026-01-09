import { requireAuth } from '@/lib/auth/server';
import { WorkspaceCreationForm } from '@/components/workspace-creation-form';
import { AuthLayout } from '@/components/auth-layout';

export default async function CreateWorkspacePage() {
  await requireAuth();

  return (
    <AuthLayout
      title="Create Workspace"
      description="Set up your business workspace to get started with BizDesk."
    >
      <WorkspaceCreationForm />
    </AuthLayout>
  );
}