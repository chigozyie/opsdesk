import { Suspense } from 'react';
import { InvoiceList } from '@/components/invoice-list';
import { InvoiceFilters } from '@/components/invoice-filters';

interface InvoicesPageProps {
  params: {
    workspaceSlug: string;
  };
  searchParams: {
    search?: string;
    status?: string;
    customer_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
  };
}

export default function InvoicesPage({ params, searchParams }: InvoicesPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-600">
            Manage your invoices and track payments
          </p>
        </div>
        <a
          href={`/app/${params.workspaceSlug}/invoices/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Invoice
        </a>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <Suspense fallback={<div>Loading filters...</div>}>
            <InvoiceFilters
              workspaceSlug={params.workspaceSlug}
              initialFilters={searchParams}
            />
          </Suspense>
        </div>

        <Suspense fallback={<div className="p-6">Loading invoices...</div>}>
          <InvoiceList
            workspaceSlug={params.workspaceSlug}
            filters={searchParams}
          />
        </Suspense>
      </div>
    </div>
  );
}