import { getWorkspaceContext } from '@/lib/workspace/context';
import { getExpense } from '@/lib/server-actions/expense-actions';
import { ExpenseForm } from '@/components/expense-form';

interface EditExpensePageProps {
  params: { 
    workspaceSlug: string;
    expenseId: string;
  };
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const workspace = await getWorkspaceContext(params.workspaceSlug);
  
  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  // Check permissions
  if (workspace.role === 'viewer') {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Access Denied</div>
          <div className="text-sm text-gray-600">
            You don&apos;t have permission to edit expenses.
          </div>
        </div>
      </div>
    );
  }

  // Fetch expense
  const expenseResult = await getExpense({
    id: params.expenseId,
    workspace_id: workspace.id,
  });

  if (!expenseResult.success) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Expense not found</div>
          <div className="text-sm text-gray-600">
            {expenseResult.message}
          </div>
        </div>
      </div>
    );
  }

  const expense = expenseResult.data!;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Expense</h1>
        <p className="mt-2 text-sm text-gray-700">
          Update expense information for {expense.vendor}.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ExpenseForm
          workspaceId={workspace.id}
          workspaceSlug={params.workspaceSlug}
          mode="edit"
          expense={expense}
        />
      </div>
    </div>
  );
}