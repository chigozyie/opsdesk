import { requireAuth } from '@/lib/auth/server';
import { getWorkspaceBySlug } from '@/lib/workspace/actions';
import { getCustomer } from '@/lib/server-actions/customer-actions';
import { CustomerForm } from '@/components/customer-form';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

interface EditCustomerPageProps {
  params: {
    workspaceSlug: string;
    customerId: string;
  };
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  await requireAuth();
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  
  if (!workspace) {
    notFound();
  }

  // Only admins and members can edit customers
  if (workspace.role === 'viewer') {
    redirect(`/app/${params.workspaceSlug}/customers/${params.customerId}`);
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-gray-600">
            Update {customer.name}&apos;s information.
          </p>
        </div>
        <Link
          href={`/app/${params.workspaceSlug}/customers/${params.customerId}`}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          ← Back to Customer
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <CustomerForm
            workspaceId={workspace.id}
            workspaceSlug={params.workspaceSlug}
            mode="edit"
            customer={customer}
          />
        </div>
      </div>
    </div>
  );
}