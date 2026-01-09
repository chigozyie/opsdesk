'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteExpense } from '@/lib/server-actions/expense-actions';
import type { Expense } from '@/lib/validation/schemas/expense';

interface ExpenseDetailProps {
  expense: Expense;
  workspaceSlug: string;
  userRole: 'admin' | 'member' | 'viewer';
}

const formatCategoryLabel = (category: string) => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function ExpenseDetail({ expense, workspaceSlug, userRole }: ExpenseDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

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
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteExpense = async () => {
    if (isDeleting) return;

    const confirmed = confirm(
      `Are you sure you want to delete this expense from ${expense.vendor}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const result = await deleteExpense({
        id: expense.id,
        workspace_id: expense.workspace_id,
      });

      if (result.success) {
        router.push(`/app/${workspaceSlug}/expenses`);
        router.refresh();
      } else {
        alert(result.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('An error occurred while deleting the expense');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {expense.vendor}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Expense details and information
            </p>
          </div>
          {canModify && (
            <div className="flex space-x-3">
              <Link
                href={`/app/${workspaceSlug}/expenses/${expense.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit
              </Link>
              <button
                onClick={handleDeleteExpense}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200">
        <dl>
          {/* Vendor */}
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Vendor</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {expense.vendor}
            </dd>
          </div>

          {/* Category */}
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Category</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                {formatCategoryLabel(expense.category)}
              </span>
            </dd>
          </div>

          {/* Amount */}
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Amount</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <span className="text-lg font-semibold">
                {formatCurrency(expense.amount)}
              </span>
            </dd>
          </div>

          {/* Expense Date */}
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Expense Date</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatDate(expense.expense_date)}
            </dd>
          </div>

          {/* Description */}
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {expense.description || (
                <span className="text-gray-400 italic">No description provided</span>
              )}
            </dd>
          </div>

          {/* Receipt */}
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Receipt</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {expense.receipt_url ? (
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900"
                >
                  View Receipt →
                </a>
              ) : (
                <span className="text-gray-400 italic">No receipt attached</span>
              )}
            </dd>
          </div>

          {/* Created */}
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatDateTime(expense.created_at)}
            </dd>
          </div>

          {/* Last Updated */}
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatDateTime(expense.updated_at)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}