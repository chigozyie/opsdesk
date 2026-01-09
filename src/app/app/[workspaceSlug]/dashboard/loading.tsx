import { DashboardMetricsSkeleton } from '@/components/ui/loading-states';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-80 bg-muted animate-pulse rounded" />
      </div>

      {/* Dashboard metrics skeleton */}
      <DashboardMetricsSkeleton />

      {/* Financial summary skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-6 w-40 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-6 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                <div className="flex flex-col items-end space-y-1">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity skeleton */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}