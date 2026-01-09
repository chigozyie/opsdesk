'use client';

import { useState, useEffect } from 'react';
import { getAuditLogs } from '@/lib/server-actions/audit-actions';
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
  workspaceSlug: string;
  filters: {
    resourceType?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  };
}

export function AuditLogsList({ workspaceSlug, filters }: AuditLogsListProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(parseInt(filters.page || '1'));
  const [hasMore, setHasMore] = useState(false);
  const [filterForm, setFilterForm] = useState({
    resourceType: filters.resourceType || '',
    action: filters.action || '',
    startDate: filters.startDate || '',
    endDate: filters.endDate || '',
  });

  const loadAuditLogs = async (page = 1, resetLogs = true) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAuditLogs({
        workspaceSlug,
        page,
        resourceType: filterForm.resourceType || undefined,
        action: filterForm.action || undefined,
        startDate: filterForm.startDate || undefined,
        endDate: filterForm.endDate || undefined,
      });

      if (result.success && result.data) {
        if (resetLogs) {
          setLogs(result.data.logs);
        } else {
          setLogs(prev => [...prev, ...result.data.logs]);
        }
        setHasMore(result.data.pagination.hasMore);
        setCurrentPage(page);
      } else {
        setError(result.message || 'Failed to load audit logs');
      }
    } catch (err) {
      setError('An error occurred while loading audit logs');
      console.error('Audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs(1, true);
  }, [workspaceSlug]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditLogs(1, true);
  };

  const handleLoadMore = () => {
    loadAuditLogs(currentPage + 1, false);
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
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium mb-4">Filter Audit Logs</h3>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField
            label="Resource Type"
            name="resourceType"
            type="select"
            value={filterForm.resourceType}
            onChange={(e) => setFilterForm(prev => ({ ...prev, resourceType: e.target.value }))}
            options={[
              { value: '', label: 'All Resources' },
              { value: 'customers', label: 'Customers' },
              { value: 'invoices', label: 'Invoices' },
              { value: 'expenses', label: 'Expenses' },
              { value: 'tasks', label: 'Tasks' },
              { value: 'payments', label: 'Payments' },
              { value: 'workspace_members', label: 'Members' },
            ]}
          />
          
          <FormField
            label="Action"
            name="action"
            type="select"
            value={filterForm.action}
            onChange={(e) => setFilterForm(prev => ({ ...prev, action: e.target.value }))}
            options={[
              { value: '', label: 'All Actions' },
              { value: 'CREATE', label: 'Create' },
              { value: 'UPDATE', label: 'Update' },
              { value: 'DELETE', label: 'Delete' },
            ]}
          />
          
          <FormField
            label="Start Date"
            name="startDate"
            type="date"
            value={filterForm.startDate}
            onChange={(e) => setFilterForm(prev => ({ ...prev, startDate: e.target.value }))}
          />
          
          <FormField
            label="End Date"
            name="endDate"
            type="date"
            value={filterForm.endDate}
            onChange={(e) => setFilterForm(prev => ({ ...prev, endDate: e.target.value }))}
          />
          
          <div className="md:col-span-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Filtering...' : 'Apply Filters'}
            </Button>
          </div>
        </form>
      </div>

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
              variant="outline"
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}