'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDebouncedSearch } from '@/lib/utils/search-optimization';

interface SearchField {
  key: string;
  label: string;
  placeholder?: string;
}

interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'date' | 'number' | 'text';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface AdvancedSearchProps {
  workspaceSlug: string;
  searchFields: SearchField[];
  filterFields?: FilterField[];
  initialValues?: Record<string, string>;
  onSearch?: (filters: Record<string, string>) => void;
  showAdvancedFilters?: boolean;
  className?: string;
}

export function AdvancedSearch({
  workspaceSlug,
  searchFields,
  filterFields = [],
  initialValues = {},
  onSearch,
  showAdvancedFilters = true,
  className = '',
}: AdvancedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>(initialValues);

  // Create debounced search function
  const debouncedSearch = useCallback(
    createDebouncedSearch((searchQuery: string) => {
      updateFilters({ search: searchQuery });
    }, 300),
    [workspaceSlug]
  );

  const updateFilters = useCallback((newFilters: Record<string, string>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    // Update URL parameters
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to first page when filters change
    params.delete('page');

    // Build new URL
    const currentPath = window.location.pathname;
    const queryString = params.toString();
    const newUrl = `${currentPath}${queryString ? `?${queryString}` : ''}`;
    
    router.push(newUrl as any);

    // Call optional callback
    if (onSearch) {
      onSearch(updatedFilters);
    }
  }, [filters, searchParams, router, onSearch]);

  const clearFilters = () => {
    setFilters({});
    const currentPath = window.location.pathname;
    router.push(currentPath as any);
    
    if (onSearch) {
      onSearch({});
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value.trim() !== '');

  // Handle search input change with debouncing
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    debouncedSearch(value);
  };

  // Handle filter field changes
  const handleFilterChange = (key: string, value: string) => {
    updateFilters({ [key]: value });
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4">
        {/* Main Search Bar */}
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder={`Search ${searchFields.map(f => f.label.toLowerCase()).join(', ')}...`}
                value={filters.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          {showAdvancedFilters && filterFields.length > 0 && (
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isAdvancedOpen || hasActiveFilters
                  ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <svg
                className={`-ml-1 mr-2 h-4 w-4 transition-transform ${
                  isAdvancedOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                  {Object.values(filters).filter(v => v && v.trim() !== '').length}
                </span>
              )}
            </button>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {isAdvancedOpen && filterFields.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterFields.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={field.key}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {field.label}
                  </label>
                  
                  {field.type === 'select' && field.options ? (
                    <select
                      id={field.key}
                      value={filters[field.key] || ''}
                      onChange={(e) => handleFilterChange(field.key, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All {field.label}</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      id={field.key}
                      value={filters[field.key] || ''}
                      onChange={(e) => handleFilterChange(field.key, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      id={field.key}
                      placeholder={field.placeholder}
                      value={filters[field.key] || ''}
                      onChange={(e) => handleFilterChange(field.key, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      id={field.key}
                      placeholder={field.placeholder}
                      value={filters[field.key] || ''}
                      onChange={(e) => handleFilterChange(field.key, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              {Object.entries(filters).map(([key, value]) => {
                if (!value || value.trim() === '') return null;
                
                const field = filterFields.find(f => f.key === key);
                const label = field?.label || key;
                
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {label}: {value}
                    <button
                      type="button"
                      onClick={() => handleFilterChange(key, '')}
                      className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}