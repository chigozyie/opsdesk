import { requireAuth } from '@/lib/auth/server';
import { getWorkspaceBySlug } from '@/lib/workspace/actions';
import { getCustomers } from '@/lib/server-actions/customer-actions';
import { CustomerList } from '@/components/customer-list';
import { CustomerFilters } from '@/components/customer-filters';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface CustomersPageProps {
  params: {
    workspaceSlug: string;
  };
  searchParams: {
    search?: string;
    archived?: string;
    page?: string;
  };
}

export default async function CustomersPage({ params, searchParams }: CustomersPageProps) {
  await requireAuth();
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  
  if (!workspace) {
    notFound();
  }

  // Parse search parameters
  const search = searchParams.search || '';
  const archived = searchParams.archived === 'true';
  const page = parseInt(searchParams.page || '1', 10);

  // Fetch customers
  const customersResult = await getCustomers({
    workspace_id: workspace.id,
    search,
    archived,
    page,
    limit: 20,
  });

  if (!customersResult.success) {
    throw new Error(customersResult.message || 'Failed to fetch customers');
  }

  const { customers, total, hasMore } = customersResult.data!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">
            Manage your customer relationships and contact information.
          </p>
        </div>
        {(workspace.role === 'admin' || workspace.role === 'member') && (
          <Link
            href={`/app/${params.workspaceSlug}/customers/new`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Customer
          </Link>
        )}
      </div>

      {/* Filters */}
      <CustomerFilters
        workspaceSlug={params.workspaceSlug}
        initialSearch={search}
        initialArchived={archived}
      />

      {/* Customer List */}
      <div className="bg-white shadow rounded-lg">
        <CustomerList
          customers={customers}
          workspaceSlug={params.workspaceSlug}
          userRole={workspace.role}
          currentPage={page}
          totalCustomers={total}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}