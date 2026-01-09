import { getWorkspaceContext } from '@/lib/workspace/context';
import { ExpenseForm } from '@/components/expense-form';

interface NewExpensePageProps {
  params: { workspaceSlug: string };
}

export default async function NewExpensePage({ params }: NewExpensePageProps) {
  const { workspace, userRole } = await getWorkspaceContext(params.workspaceSlug);
  
  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  // Check permissions
  if (userRole === 'viewer') {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Access Denied</div>
          <div className="text-sm text-gray-600">
            You don't have permission to create expenses.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Add New Expense</h1>
        <p className="mt-2 text-sm text-gray-700">
          Record a new business expense.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ExpenseForm
          workspaceId={workspace.id}
          workspaceSlug={params.workspaceSlug}
          mode="create"
        />
      </div>
    </div>
  );
}