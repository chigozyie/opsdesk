'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getExpenseCategories, getExpenseVendors } from '@/lib/server-actions/expense-actions';

interface ExpenseFiltersProps {
  workspaceSlug: string;
  currentFilters: {
    search?: string;
    category?: string;
    vendor?: string;
    date_from?: string;
    date_to?: string;
    amount_min?: string;
    amount_max?: string;
  };
}

const formatCategoryLabel = (category: string) => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function ExpenseFilters({ workspaceSlug, currentFilters }: ExpenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load categories and vendors
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // Note: In a real implementation, you'd get the workspace ID from context
        const workspaceId = 'temp-workspace-id';
        
        const [categoriesResult, vendorsResult] = await Promise.all([
          getExpenseCategories({ workspace_id: workspaceId }),
          getExpenseVendors({ workspace_id: workspaceId }),
        ]);

        if (categoriesResult.success) {
          setCategories(categoriesResult.data || []);
        }

        if (vendorsResult.success) {
          setVendors(vendorsResult.data || []);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, []);

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    
    // Update or remove filter parameters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    params.delete('page');

    const queryString = params.toString();
    const url = `/app/${workspaceSlug}/expenses${queryString ? `?${queryString}` : ''}`;
    router.push(url as any);
  };

  const clearFilters = () => {
    router.push(`/app/${workspaceSlug}/expenses`);
  };

  const hasActiveFilters = Object.values(currentFilters).some(value => value && value.trim() !== '');

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Vendor, category, or description"
            defaultValue={currentFilters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            defaultValue={currentFilters.category || ''}
            onChange={(e) => updateFilters({ category: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor */}
        <div>
          <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1">
            Vendor
          </label>
          <select
            id="vendor"
            defaultValue={currentFilters.vendor || ''}
            onChange={(e) => updateFilters({ vendor: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={loading}
          >
            <option value="">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="flex space-x-2">
            <input
              type="date"
              placeholder="From"
              defaultValue={currentFilters.date_from || ''}
              onChange={(e) => updateFilters({ date_from: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <input
              type="date"
              placeholder="To"
              defaultValue={currentFilters.date_to || ''}
              onChange={(e) => updateFilters({ date_to: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Amount Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount Range
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Min"
              defaultValue={currentFilters.amount_min || ''}
              onChange={(e) => updateFilters({ amount_min: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Max"
              defaultValue={currentFilters.amount_max || ''}
              onChange={(e) => updateFilters({ amount_max: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}