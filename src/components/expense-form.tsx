'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createExpense, updateExpense } from '@/lib/server-actions/expense-actions';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import type { Expense } from '@/lib/validation/schemas/expense';

interface ExpenseFormProps {
  workspaceId: string;
  workspaceSlug: string;
  mode: 'create' | 'edit';
  expense?: Expense;
}

const EXPENSE_CATEGORIES = [
  'office_supplies',
  'travel',
  'meals',
  'software',
  'marketing',
  'utilities',
  'rent',
  'insurance',
  'professional_services',
  'equipment',
  'other',
];

const formatCategoryLabel = (category: string) => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function ExpenseForm({ workspaceId, workspaceSlug, mode, expense }: ExpenseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const data = {
        vendor: formData.get('vendor') as string,
        category: formData.get('category') as string,
        amount: parseFloat(formData.get('amount') as string),
        expense_date: formData.get('expense_date') as string,
        description: formData.get('description') as string,
        receipt_url: formData.get('receipt_url') as string,
        workspace_id: workspaceId,
      };

      let result;
      if (mode === 'create') {
        result = await createExpense(data);
      } else {
        result = await updateExpense({
          ...data,
          id: expense!.id,
        });
      }

      if (result.success) {
        if (mode === 'create') {
          router.push(`/app/${workspaceSlug}/expenses/${result.data!.id}`);
        } else {
          router.push(`/app/${workspaceSlug}/expenses/${expense!.id}`);
        }
        router.refresh();
      } else {
        // Handle validation errors
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((error) => {
            errorMap[error.field] = error.message;
          });
          setErrors(errorMap);
        } else {
          setErrors({ general: result.message || 'An error occurred' });
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{errors.general}</div>
        </div>
      )}

      {/* Vendor */}
      <div>
        <FormField
          label="Vendor"
          id="vendor"
          name="vendor"
          type="text"
          required
          defaultValue={expense?.vendor || ''}
          placeholder="Enter vendor name"
        />
        {errors.vendor && (
          <p className="mt-1 text-sm text-red-600">{errors.vendor}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <div className="mt-1">
          <select
            id="category"
            name="category"
            required
            defaultValue={expense?.category || ''}
            className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a category</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
        </div>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <FormField
          label="Amount"
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={expense?.amount?.toString() || ''}
          placeholder="0.00"
        />
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
        )}
      </div>

      {/* Expense Date */}
      <div>
        <FormField
          label="Expense Date"
          id="expense_date"
          name="expense_date"
          type="date"
          required
          defaultValue={expense?.expense_date || ''}
        />
        {errors.expense_date && (
          <p className="mt-1 text-sm text-red-600">{errors.expense_date}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={expense?.description || ''}
            placeholder="Enter expense description (optional)"
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Receipt URL */}
      <div>
        <FormField
          label="Receipt URL"
          id="receipt_url"
          name="receipt_url"
          type="url"
          defaultValue={expense?.receipt_url || ''}
          placeholder="https://example.com/receipt.pdf (optional)"
        />
        {errors.receipt_url && (
          <p className="mt-1 text-sm text-red-600">{errors.receipt_url}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            if (mode === 'edit') {
              router.push(`/app/${workspaceSlug}/expenses/${expense!.id}`);
            } else {
              router.push(`/app/${workspaceSlug}/expenses`);
            }
          }}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText={mode === 'create' ? 'Creating...' : 'Updating...'}
          className="w-auto"
        >
          {mode === 'create' ? 'Create Expense' : 'Update Expense'}
        </Button>
      </div>
    </form>
  );
}