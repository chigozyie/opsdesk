'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: any;
  created_at: string;
  user: {
    email: string;
  } | null;
  ip_address: string | null;
  user_agent: string | null;
}

interface AuditLogsListProps {
  initialLogs: AuditLog[];
  initialFilters: {
    resourceType?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  };
  hasMore: boolean;
  workspaceSlug: string;
}

export function AuditLogsList({ initialLogs, initialFilters, hasMore: initialHasMore }: AuditLogsListProps) {
  const [logs] = useState<AuditLog[]>(initialLogs);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [hasMore] = useState(initialHasMore);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, we'll just show a message that filtering requires a page refresh
    // In a full implementation, you'd want to use router.push to update the URL
    alert('Please use the browser to navigate with new filters. This will be improved in a future update.');
  };

  const handleLoadMore = () => {
    // For now, we'll just show a message that load more requires server-side implementation
    alert('Load more functionality requires server-side implementation. This will be improved in a future update.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatResourceType = (resourceType: string) => {
    return resourceType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Audit Logs */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Audit Logs</h3>
        </div>
        
        {error && (
          <div className="p-6 text-red-600 bg-red-50 border-b">
            {error}
          </div>
        )}

        {logs.length === 0 && !loading && !error && (
          <div className="p-6 text-center text-gray-500">
            No audit logs found for the selected criteria.
          </div>
        )}

        <div className="divide-y">
          {logs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                      {formatAction(log.action)}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatResourceType(log.resource_type)}
                    </span>
                    {log.resource_id && (
                      <span className="text-sm text-gray-500">
                        ID: {log.resource_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">User:</span> {log.user?.email || 'System'}
                    {log.ip_address && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-medium">IP:</span> {log.ip_address}
                      </>
                    )}
                  </div>
                  
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                        View Changes
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                
                <div className="text-sm text-gray-500 text-right">
                  {formatDate(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="p-6 border-t text-center">
            <Button
              onClick={handleLoadMore}
              disabled={loading}
              variant="secondary"
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}