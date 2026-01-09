import { requireAuth } from '@/lib/auth/server';
import { getWorkspaceBySlug } from '@/lib/workspace/actions';
import { CustomerForm } from '@/components/customer-form';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

interface NewCustomerPageProps {
  params: {
    workspaceSlug: string;
  };
}

export default async function NewCustomerPage({ params }: NewCustomerPageProps) {
  await requireAuth();
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  
  if (!workspace) {
    notFound();
  }

  // Only admins and members can create customers
  if (workspace.role === 'viewer') {
    redirect(`/app/${params.workspaceSlug}/customers`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
          <p className="text-gray-600">
            Create a new customer record for your business.
          </p>
        </div>
        <Link
          href={`/app/${params.workspaceSlug}/customers`}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          ← Back to Customers
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <CustomerForm
            workspaceId={workspace.id}
            workspaceSlug={params.workspaceSlug}
            mode="create"
          />
        </div>
      </div>
    </div>
  );
}