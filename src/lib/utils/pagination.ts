/**
 * Pagination utilities for consistent pagination across the application
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startItem: number;
  endItem: number;
}

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 5;

/**
 * Validates and normalizes pagination parameters
 */
export function validatePaginationParams(params: Partial<PaginationParams>): PaginationParams {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, params.limit || DEFAULT_PAGE_SIZE));
  
  return { page, limit };
}

/**
 * Calculates pagination information
 */
export function calculatePaginationInfo(
  currentPage: number,
  totalItems: number,
  itemsPerPage: number
): PaginationInfo {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const normalizedPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const startItem = totalItems === 0 ? 0 : (normalizedPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(normalizedPage * itemsPerPage, totalItems);
  
  return {
    currentPage: normalizedPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: normalizedPage < totalPages,
    hasPreviousPage: normalizedPage > 1,
    startItem,
    endItem,
  };
}

/**
 * Generates page numbers for pagination display
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  // Always show first page
  pages.push(1);

  let startPage = Math.max(2, currentPage - halfVisible);
  let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust range if we're near the beginning or end
  if (currentPage <= halfVisible + 1) {
    endPage = Math.min(totalPages - 1, maxVisible - 1);
  } else if (currentPage >= totalPages - halfVisible) {
    startPage = Math.max(2, totalPages - maxVisible + 2);
  }

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pages.push('ellipsis');
  }

  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (endPage < totalPages - 1) {
    pages.push('ellipsis');
  }

  // Always show last page (if more than 1 page)
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Creates a pagination result object
 */
export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    data,
    total,
    page,
    limit,
    hasMore,
    totalPages,
  };
}

/**
 * Calculates database offset for pagination queries
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Builds URL search params for pagination
 */
export function buildPaginationSearchParams(
  currentParams: URLSearchParams,
  page: number,
  additionalParams?: Record<string, string>
): URLSearchParams {
  const params = new URLSearchParams(currentParams);
  
  if (page > 1) {
    params.set('page', page.toString());
  } else {
    params.delete('page');
  }

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  }

  return params;
}

/**
 * Extracts pagination parameters from URL search params
 */
export function extractPaginationFromSearchParams(searchParams: URLSearchParams): PaginationParams {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE.toString(), 10);
  
  return validatePaginationParams({ page, limit });
}