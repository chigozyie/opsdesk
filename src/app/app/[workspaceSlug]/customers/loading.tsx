import { TableSkeleton } from '@/components/ui/loading-states';

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="h-10 w-full sm:w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-full sm:w-32 bg-muted animate-pulse rounded" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white border rounded-lg p-4">
        <TableSkeleton rows={10} />
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        <div className="flex space-x-2">
          <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div className="h-10 w-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}