'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { archiveCustomer } from '@/lib/server-actions/customer-actions';
import type { Customer } from '@/lib/validation/schemas/customer';

interface CustomerListProps {
  customers: Customer[];
  workspaceSlug: string;
  userRole: 'admin' | 'member' | 'viewer';
  currentPage: number;
  totalCustomers: number;
  hasMore: boolean;
}

export function CustomerList({ 
  customers, 
  workspaceSlug, 
  userRole, 
  currentPage, 
  totalCustomers, 
  hasMore 
}: CustomerListProps) {
  const router = useRouter();
  const [archivingCustomers, setArchivingCustomers] = useState<Set<string>>(new Set());

  const canModify = userRole === 'admin' || userRole === 'member';

  const handleArchiveCustomer = async (customer: Customer) => {
    if (archivingCustomers.has(customer.id)) return;

    const confirmed = confirm(
      customer.archived 
        ? `Are you sure you want to restore ${customer.name}?`
        : `Are you sure you want to archive ${customer.name}? This will hide them from the main list but preserve all data.`
    );

    if (!confirmed) return;

    setArchivingCustomers(prev => new Set(prev).add(customer.id));

    try {
      const result = await archiveCustomer({
        id: customer.id,
        workspace_id: customer.workspace_id,
        archived: !customer.archived,
      });

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error archiving customer:', error);
      alert('An error occurred while updating the customer');
    } finally {
      setArchivingCustomers(prev => {
        const next = new Set(prev);
        next.delete(customer.id);
        return next;
      });
    }
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first customer.
        </p>
        {canModify && (
          <div className="mt-6">
            <Link
              href={`/app/${workspaceSlug}/customers/new` as any}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Customer
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Customer Table */}
      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              {canModify && (
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <Link
                      href={`/app/${workspaceSlug}/customers/${customer.id}` as any}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                    >
                      {customer.name}
                    </Link>
                    {customer.address && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {customer.address}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {customer.email && (
                      <div>
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="text-gray-500">
                        <a
                          href={`tel:${customer.phone}`}
                          className="hover:text-gray-700"
                        >
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {!customer.email && !customer.phone && (
                      <span className="text-gray-400">No contact info</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.archived
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {customer.archived ? 'Archived' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(customer.created_at).toLocaleDateString()}
                </td>
                {canModify && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/app/${workspaceSlug}/customers/${customer.id}/edit` as any}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleArchiveCustomer(customer)}
                        disabled={archivingCustomers.has(customer.id)}
                        className={`${
                          customer.archived
                            ? 'text-green-600 hover:text-green-900'
                            : 'text-red-600 hover:text-red-900'
                        } disabled:opacity-50`}
                      >
                        {archivingCustomers.has(customer.id)
                          ? 'Processing...'
                          : customer.archived
                          ? 'Restore'
                          : 'Archive'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCustomers > 20 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            {currentPage > 1 && (
              <Link
                href={`/app/${workspaceSlug}/customers?page=${currentPage - 1}` as any}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {hasMore && (
              <Link
                href={`/app/${workspaceSlug}/customers?page=${currentPage + 1}` as any}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * 20 + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 20, totalCustomers)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{totalCustomers}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {currentPage > 1 && (
                  <Link
                    href={`/app/${workspaceSlug}/customers?page=${currentPage - 1}` as any}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {hasMore && (
                  <Link
                    href={`/app/${workspaceSlug}/customers?page=${currentPage + 1}` as any}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}