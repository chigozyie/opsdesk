'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { archiveCustomer, deleteCustomer } from '@/lib/server-actions/customer-actions';
import type { Customer } from '@/lib/validation/schemas/customer';
import Link from 'next/link';

interface CustomerDetailProps {
  customer: Customer;
  workspaceSlug: string;
  userRole: 'admin' | 'member' | 'viewer';
}

export function CustomerDetail({ customer, workspaceSlug, userRole }: CustomerDetailProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canModify = userRole === 'admin' || userRole === 'member';
  const canDelete = userRole === 'admin';

  const handleArchive = async () => {
    const action = customer.archived ? 'restore' : 'archive';
    const confirmed = confirm(
      customer.archived
        ? `Are you sure you want to restore ${customer.name}?`
        : `Are you sure you want to archive ${customer.name}? This will hide them from the main list but preserve all data.`
    );

    if (!confirmed) return;

    setIsArchiving(true);

    try {
      const result = await archiveCustomer({
        id: customer.id,
        workspace_id: customer.workspace_id,
        archived: !customer.archived,
      });

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message || `Failed to ${action} customer`);
      }
    } catch (error) {
      console.error(`Error ${action}ing customer:`, error);
      alert(`An error occurred while ${action}ing the customer`);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm(
      `Are you sure you want to permanently delete ${customer.name}? This action cannot be undone and will fail if the customer has associated invoices.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const result = await deleteCustomer({
        id: customer.id,
        workspace_id: customer.workspace_id,
      });

      if (result.success) {
        router.push(`/app/${workspaceSlug}/customers`);
        router.refresh();
      } else {
        alert(result.message || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('An error occurred while deleting the customer');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.archived
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {customer.archived ? 'Archived' : 'Active'}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.name}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(customer.created_at).toLocaleDateString()}
              </dd>
            </div>

            {customer.address && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {customer.address}
                </dd>
              </div>
            )}
          </dl>

          {/* Actions */}
          {canModify && (
            <div className="mt-6 flex items-center space-x-3">
              <Link
                href={`/app/${workspaceSlug}/customers/${customer.id}/edit`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Customer
              </Link>
              
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  customer.archived
                    ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
                }`}
              >
                {isArchiving
                  ? 'Processing...'
                  : customer.archived
                  ? 'Restore Customer'
                  : 'Archive Customer'}
              </button>

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Customer'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
          
          {/* Placeholder for invoices and payments */}
          <div className="text-center py-8">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h4 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h4>
            <p className="mt-1 text-sm text-gray-500">
              Invoices and payments for this customer will appear here.
            </p>
            {canModify && (
              <div className="mt-6">
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Create Invoice (Coming Soon)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Log</h3>
          
          <div className="flow-root">
            <ul className="-mb-8">
              <li>
                <div className="relative pb-8">
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          Customer created
                        </p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              
              {customer.updated_at !== customer.created_at && (
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Customer information updated
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {new Date(customer.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}