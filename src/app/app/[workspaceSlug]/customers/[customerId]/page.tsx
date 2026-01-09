import { requireAuth } from '@/lib/auth/server';
import { getWorkspaceBySlug } from '@/lib/workspace/actions';
import { getCustomer } from '@/lib/server-actions/customer-actions';
import { CustomerDetail } from '@/components/customer-detail';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface CustomerDetailPageProps {
  params: {
    workspaceSlug: string;
    customerId: string;
  };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  await requireAuth();
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  
  if (!workspace) {
    notFound();
  }

  // Fetch customer
  const customerResult = await getCustomer({
    id: params.customerId,
    workspace_id: workspace.id,
  });

  if (!customerResult.success || !customerResult.data) {
    notFound();
  }

  const customer = customerResult.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-gray-600">
            Customer details and transaction history.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/app/${params.workspaceSlug}/customers`}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Back to Customers
          </Link>
          {(workspace.role === 'admin' || workspace.role === 'member') && (
            <Link
              href={`/app/${params.workspaceSlug}/customers/${params.customerId}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Edit Customer
            </Link>
          )}
        </div>
      </div>

      {/* Customer Detail */}
      <CustomerDetail
        customer={customer}
        workspaceSlug={params.workspaceSlug}
        userRole={workspace.role}
      />
    </div>
  );
}