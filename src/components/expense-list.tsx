'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteExpense } from '@/lib/server-actions/expense-actions';
import { Pagination } from '@/components/pagination';
import type { Expense } from '@/lib/validation/schemas/expense';

interface ExpenseListProps {
  expenses: Expense[];
  workspaceSlug: string;
  userRole: 'admin' | 'member' | 'viewer';
  currentPage: number;
  totalExpenses: number;
  hasMore: boolean;
}

export function ExpenseList({ 
  expenses, 
  workspaceSlug, 
  userRole, 
  currentPage, 
  totalExpenses, 
  hasMore 
}: ExpenseListProps) {
  const router = useRouter();
  const [deletingExpenses, setDeletingExpenses] = useState<Set<string>>(new Set());

  const canModify = userRole === 'admin' || userRole === 'member';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (deletingExpenses.has(expense.id)) return;

    const confirmed = confirm(
      `Are you sure you want to delete this expense from ${expense.vendor}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingExpenses(prev => new Set(prev).add(expense.id));

    try {
      const result = await deleteExpense({
        id: expense.id,
        workspace_id: expense.workspace_id,
      });

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('An error occurred while deleting the expense');
    } finally {
      setDeletingExpenses(prev => {
        const next = new Set(prev);
        next.delete(expense.id);
        return next;
      });
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by recording your first expense.
        </p>
        {canModify && (
          <div className="mt-6">
            <Link
              href={`/app/${workspaceSlug}/expenses/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Expense
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Expense Table */}
      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              {canModify && (
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <Link
                      href={`/app/${workspaceSlug}/expenses/${expense.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                    >
                      {expense.vendor}
                    </Link>
                    {expense.receipt_url && (
                      <div className="mt-1">
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          📎 Receipt
                        </a>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {expense.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(expense.expense_date)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {expense.description || '-'}
                  </div>
                </td>
                {canModify && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/app/${workspaceSlug}/expenses/${expense.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteExpense(expense)}
                        disabled={deletingExpenses.has(expense.id)}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingExpenses.has(expense.id) ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalExpenses}
        itemsPerPage={20}
        baseUrl={`/app/${workspaceSlug}/expenses`}
      />
    </div>
  );
}