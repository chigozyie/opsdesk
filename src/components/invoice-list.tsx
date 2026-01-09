'use client';

import { useEffect, useState } from 'react';
import { getInvoices } from '@/lib/server-actions/invoice-actions';
import type { Invoice } from '@/lib/validation/schemas/invoice';

interface InvoiceListProps {
  workspaceSlug: string;
  filters: {
    search?: string;
    status?: string;
    customer_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
  };
}

interface InvoiceListState {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export function InvoiceList({ workspaceSlug, filters }: InvoiceListProps) {
  const [state, setState] = useState<InvoiceListState>({
    invoices: [],
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadInvoices();
  }, [filters]);

  const loadInvoices = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get workspace ID from slug (in a real app, you'd have this from context)
      const workspaceId = 'temp-workspace-id'; // This would come from workspace context

      const result = await getInvoices({
        workspace_id: workspaceId,
        search: filters.search,
        status: filters.status as any,
        customer_id: filters.customer_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
        page: parseInt(filters.page || '1'),
        limit: 20,
      });

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          invoices: result.data!.invoices,
          total: result.data!.total,
          page: result.data!.page,
          limit: result.data!.limit,
          hasMore: result.data!.hasMore,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.message || 'Failed to load invoices',
          loading: false,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'An unexpected error occurred',
        loading: false,
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (state.loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading invoices</div>
          <div className="text-sm text-gray-600 mb-4">{state.error}</div>
          <button
            onClick={loadInvoices}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (state.invoices.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-gray-500 mb-2">No invoices found</div>
          <div className="text-sm text-gray-400 mb-4">
            {filters.search || filters.status || filters.customer_id
              ? 'Try adjusting your filters'
              : 'Create your first invoice to get started'}
          </div>
          <a
            href={`/app/${workspaceSlug}/invoices/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Invoice
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {state.invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {(invoice as any).customer?.name || 'Unknown Customer'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {(invoice as any).customer?.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(invoice.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(invoice.issue_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <a
                      href={`/app/${workspaceSlug}/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </a>
                    <a
                      href={`/app/${workspaceSlug}/invoices/${invoice.id}/edit`}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {state.total > state.limit && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <a
              href="#"
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </a>
            <a
              href="#"
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </a>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(state.page - 1) * state.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(state.page * state.limit, state.total)}
                </span>{' '}
                of <span className="font-medium">{state.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {/* Pagination controls would go here */}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}