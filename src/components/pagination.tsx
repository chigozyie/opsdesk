'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  calculatePaginationInfo, 
  generatePageNumbers, 
  buildPaginationSearchParams,
  type PaginationInfo 
} from '@/lib/utils/pagination';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  baseUrl: string;
  className?: string;
  showInfo?: boolean;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  baseUrl,
  className = '',
  showInfo = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  const searchParams = useSearchParams();
  const paginationInfo = calculatePaginationInfo(currentPage, totalItems, itemsPerPage);
  
  // Don't render pagination if there's only one page or no items
  if (paginationInfo.totalPages <= 1) {
    return null;
  }

  const pageNumbers = generatePageNumbers(
    paginationInfo.currentPage,
    paginationInfo.totalPages,
    maxVisiblePages
  );

  const buildPageUrl = (page: number) => {
    const params = buildPaginationSearchParams(searchParams, page);
    const queryString = params.toString();
    return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className={`bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 ${className}`}>
      {/* Mobile pagination */}
      <div className="flex-1 flex justify-between sm:hidden">
        {paginationInfo.hasPreviousPage ? (
          <Link
            href={buildPageUrl(paginationInfo.currentPage - 1)}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Previous
          </Link>
        ) : (
          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed">
            Previous
          </span>
        )}
        
        {paginationInfo.hasNextPage ? (
          <Link
            href={buildPageUrl(paginationInfo.currentPage + 1)}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Next
          </Link>
        ) : (
          <span className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed">
            Next
          </span>
        )}
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        {showInfo && (
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">{paginationInfo.startItem}</span>
              {' '}to{' '}
              <span className="font-medium">{paginationInfo.endItem}</span>
              {' '}of{' '}
              <span className="font-medium">{paginationInfo.totalItems}</span>
              {' '}results
            </p>
          </div>
        )}
        
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* Previous button */}
            {paginationInfo.hasPreviousPage ? (
              <Link
                href={buildPageUrl(paginationInfo.currentPage - 1)}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </Link>
            ) : (
              <span className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-gray-50 text-sm font-medium text-gray-300 cursor-not-allowed">
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </span>
            )}

            {/* Page numbers */}
            {pageNumbers.map((pageNum, index) => {
              if (pageNum === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                );
              }

              const isCurrentPage = pageNum === paginationInfo.currentPage;
              
              return isCurrentPage ? (
                <span
                  key={pageNum}
                  aria-current="page"
                  className="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                >
                  {pageNum}
                </span>
              ) : (
                <Link
                  key={pageNum}
                  href={buildPageUrl(pageNum)}
                  className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                >
                  {pageNum}
                </Link>
              );
            })}

            {/* Next button */}
            {paginationInfo.hasNextPage ? (
              <Link
                href={buildPageUrl(paginationInfo.currentPage + 1)}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            ) : (
              <span className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-gray-50 text-sm font-medium text-gray-300 cursor-not-allowed">
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple pagination component for basic use cases
 */
interface SimplePaginationProps {
  currentPage: number;
  hasMore: boolean;
  baseUrl: string;
  className?: string;
}

export function SimplePagination({
  currentPage,
  hasMore,
  baseUrl,
  className = '',
}: SimplePaginationProps) {
  const searchParams = useSearchParams();

  const buildPageUrl = (page: number) => {
    const params = buildPaginationSearchParams(searchParams, page);
    const queryString = params.toString();
    return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className={`bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 ${className}`}>
      <div className="flex-1 flex justify-between">
        {currentPage > 1 ? (
          <Link
            href={buildPageUrl(currentPage - 1)}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Previous
          </Link>
        ) : (
          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed">
            Previous
          </span>
        )}
        
        {hasMore ? (
          <Link
            href={buildPageUrl(currentPage + 1)}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Next
          </Link>
        ) : (
          <span className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed">
            Next
          </span>
        )}
      </div>
    </div>
  );
}