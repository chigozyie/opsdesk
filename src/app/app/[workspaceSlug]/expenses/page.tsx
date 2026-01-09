import { Suspense } from 'react';
import Link from 'next/link';
import { getWorkspaceContext } from '@/lib/workspace/context';
import { getExpenses } from '@/lib/server-actions/expense-actions';
import { ExpenseList } from '@/components/expense-list';
import { ExpenseFilters } from '@/components/expense-filters';

interface ExpensePageProps {
  params: { workspaceSlug: string };
  searchParams: {
    search?: string;
    category?: string;
    vendor?: string;
    date_from?: string;
    date_to?: string;
    amount_min?: string;
    amount_max?: string;
    page?: string;
  };
}

export default async function ExpensePage({ params, searchParams }: ExpensePageProps) {
  const { workspace, userRole } = await getWorkspaceContext(params.workspaceSlug);
  
  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  const canModify = userRole === 'admin' || userRole === 'member';

  // Fetch expenses with filters
  const expenseFilters = {
    workspace_id: workspace.id,
    search: searchParams.search,
    category: searchParams.category,
    vendor: searchParams.vendor,
    date_from: searchParams.date_from,
    date_to: searchParams.date_to,
    amount_min: searchParams.amount_min ? parseFloat(searchParams.amount_min) : undefined,
    amount_max: searchParams.amount_max ? parseFloat(searchParams.amount_max) : undefined,
    page: parseInt(searchParams.page || '1'),
    limit: 20,
  };

  const expensesResult = await getExpenses(expenseFilters);

  if (!expensesResult.success) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading expenses</div>
          <div className="text-sm text-gray-600">{expensesResult.message}</div>
        </div>
      </div>
    );
  }

  const { expenses, total, page, hasMore } = expensesResult.data!;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track and manage your business expenses.
          </p>
        </div>
        {canModify && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href={`/app/${params.workspaceSlug}/expenses/new`}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Expense
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mt-8">
        <Suspense fallback={<div>Loading filters...</div>}>
          <ExpenseFilters
            workspaceSlug={params.workspaceSlug}
            currentFilters={searchParams}
          />
        </Suspense>
      </div>

      {/* Expense List */}
      <div className="mt-8">
        <ExpenseList
          expenses={expenses}
          workspaceSlug={params.workspaceSlug}
          userRole={userRole}
          currentPage={page}
          totalExpenses={total}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}