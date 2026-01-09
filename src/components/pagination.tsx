'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
    <div className={cn('bg-background px-4 py-3 flex items-center justify-between border-t border-border sm:px-6', className)}>
      {/* Mobile pagination */}
      <div className="flex-1 flex justify-between sm:hidden">
        {paginationInfo.hasPreviousPage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageUrl(paginationInfo.currentPage - 1) as any}>
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        
        {paginationInfo.hasNextPage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageUrl(paginationInfo.currentPage + 1) as any}>
              Next
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        {showInfo && (
          <div>
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">{paginationInfo.startItem}</span>
              {' '}to{' '}
              <span className="font-medium text-foreground">{paginationInfo.endItem}</span>
              {' '}of{' '}
              <span className="font-medium text-foreground">{paginationInfo.totalItems}</span>
              {' '}results
            </p>
          </div>
        )}
        
        <div>
          <nav className="flex items-center space-x-1" aria-label="Pagination">
            {/* Previous button */}
            {paginationInfo.hasPreviousPage ? (
              <Button variant="outline" size="icon" asChild>
                <Link href={buildPageUrl(paginationInfo.currentPage - 1) as any}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous</span>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
            )}

            {/* Page numbers */}
            {pageNumbers.map((pageNum, index) => {
              if (pageNum === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex items-center justify-center px-3 py-2 text-sm text-muted-foreground"
                  >
                    ...
                  </span>
                );
              }

              const isCurrentPage = pageNum === paginationInfo.currentPage;
              
              return isCurrentPage ? (
                <Button
                  key={pageNum}
                  variant="default"
                  size="sm"
                  className="min-w-[2.5rem]"
                  aria-current="page"
                >
                  {pageNum}
                </Button>
              ) : (
                <Button
                  key={pageNum}
                  variant="outline"
                  size="sm"
                  className="min-w-[2.5rem]"
                  asChild
                >
                  <Link href={buildPageUrl(pageNum) as any}>
                    {pageNum}
                  </Link>
                </Button>
              );
            })}

            {/* Next button */}
            {paginationInfo.hasNextPage ? (
              <Button variant="outline" size="icon" asChild>
                <Link href={buildPageUrl(paginationInfo.currentPage + 1) as any}>
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next</span>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="icon" disabled>
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
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
    <div className={cn('bg-background px-4 py-3 flex items-center justify-between border-t border-border sm:px-6', className)}>
      <div className="flex-1 flex justify-between">
        {currentPage > 1 ? (
          <Button variant="outline" asChild>
            <Link href={buildPageUrl(currentPage - 1) as any}>
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Previous
          </Button>
        )}
        
        {hasMore ? (
          <Button variant="outline" asChild>
            <Link href={buildPageUrl(currentPage + 1) as any}>
              Next
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}