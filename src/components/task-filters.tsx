'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface TaskFiltersProps {
  workspaceSlug: string;
  members: Array<{
    user_id: string;
    role: string;
    users: {
      id: string;
      email: string;
    } | null;
  }>;
  currentFilters: {
    search: string;
    status?: string;
    assigned_to: string;
    created_by: string;
  };
}

export function TaskFilters({ workspaceSlug, members, currentFilters }: TaskFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentFilters.search);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to first page when filters change
    params.delete('page');
    
    router.push(`/app/${workspaceSlug}/tasks?${params.toString()}` as any);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('search', search);
  };

  const clearFilters = () => {
    setSearch('');
    router.push(`/app/${workspaceSlug}/tasks` as any);
  };

  const hasActiveFilters = currentFilters.search || currentFilters.status || 
                          currentFilters.assigned_to || currentFilters.created_by;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Search
        </button>
      </form>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={currentFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Assigned To Filter */}
        <div>
          <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To
          </label>
          <select
            id="assigned_to"
            value={currentFilters.assigned_to || ''}
            onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.users?.email || 'Unknown User'}
              </option>
            ))}
          </select>
        </div>

        {/* Created By Filter */}
        <div>
          <label htmlFor="created_by" className="block text-sm font-medium text-gray-700 mb-1">
            Created By
          </label>
          <select
            id="created_by"
            value={currentFilters.created_by || ''}
            onChange={(e) => handleFilterChange('created_by', e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Creators</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.users?.email || 'Unknown User'}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {currentFilters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{currentFilters.search}"
              <button
                type="button"
                onClick={() => handleFilterChange('search', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {currentFilters.status && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Status: {currentFilters.status.replace('_', ' ')}
              <button
                type="button"
                onClick={() => handleFilterChange('status', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {currentFilters.assigned_to && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Assigned: {currentFilters.assigned_to === 'unassigned' ? 'Unassigned' : 
                members.find(m => m.user_id === currentFilters.assigned_to)?.users?.email || 'Unknown'}
              <button
                type="button"
                onClick={() => handleFilterChange('assigned_to', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {currentFilters.created_by && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Creator: {members.find(m => m.user_id === currentFilters.created_by)?.users?.email || 'Unknown'}
              <button
                type="button"
                onClick={() => handleFilterChange('created_by', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}