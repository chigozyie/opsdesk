'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CustomerFiltersProps {
  workspaceSlug: string;
  initialSearch: string;
  initialArchived: boolean;
}

export function CustomerFilters({ 
  workspaceSlug, 
  initialSearch, 
  initialArchived 
}: CustomerFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [archived, setArchived] = useState(initialArchived);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    
    if (archived) {
      params.set('archived', 'true');
    } else {
      params.delete('archived');
    }
    
    // Reset to page 1 when filters change
    params.delete('page');
    
    const newUrl = `/app/${workspaceSlug}/customers?${params.toString()}`;
    router.push(newUrl as any);
  }, [search, archived, workspaceSlug, router, searchParams]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleArchivedChange = (value: boolean) => {
    setArchived(value);
  };

  const clearFilters = () => {
    setSearch('');
    setArchived(false);
  };

  const hasActiveFilters = search || archived;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search customers
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <div className="mt-1">
              <select
                id="status"
                value={archived ? 'archived' : 'active'}
                onChange={(e) => handleArchivedChange(e.target.value === 'archived')}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="active">Active customers</option>
                <option value="archived">Archived customers</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: &quot;{search}&quot;
                <button
                  onClick={() => handleSearchChange('')}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            )}
            {archived && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Archived customers
                <button
                  onClick={() => handleArchivedChange(false)}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}