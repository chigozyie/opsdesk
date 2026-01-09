import Link from 'next/link';
import { getWorkspaceContext } from '@/lib/workspace/context';
import { getExpense } from '@/lib/server-actions/expense-actions';
import { ExpenseDetail } from '@/components/expense-detail';

interface ExpenseDetailPageProps {
  params: { 
    workspaceSlug: string;
    expenseId: string;
  };
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const workspace = await getWorkspaceContext(params.workspaceSlug);
  
  if (!workspace) {
    return <div>Workspace not found</div>;
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
          <div className="text-sm text-gray-600 mb-4">
            {expenseResult.message}
          </div>
          <Link
            href={`/app/${params.workspaceSlug}/expenses`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Expenses
          </Link>
        </div>
      </div>
    );
  }

  const expense = expenseResult.data!;
  const canModify = workspace.role === 'admin' || workspace.role === 'member';

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link
                  href={`/app/${params.workspaceSlug}/expenses`}
                  className="text-gray-400 hover:text-gray-500"
                >
                  Expenses
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="flex-shrink-0 h-5 w-5 text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">
                    {expense.vendor}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Expense Details
          </h1>
        </div>
        {canModify && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href={`/app/${params.workspaceSlug}/expenses/${expense.id}/edit`}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Edit Expense
            </Link>
          </div>
        )}
      </div>

      {/* Expense Details */}
      <div className="mt-8">
        <ExpenseDetail
          expense={expense}
          workspaceSlug={params.workspaceSlug}
          userRole={workspace.role}
        />
      </div>
    </div>
  );
}