import { Suspense } from 'react';
import { InvoiceForm } from '@/components/invoice-form';

interface EditInvoicePageProps {
  params: {
    workspaceSlug: string;
    invoiceId: string;
  };
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Invoice</h1>
          <p className="text-sm text-gray-600">
            Update invoice information and line items
          </p>
        </div>
        <div className="flex space-x-3">
          <a
            href={`/app/${params.workspaceSlug}/invoices/${params.invoiceId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Invoice
          </a>
          <a
            href={`/app/${params.workspaceSlug}/invoices`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Invoices
          </a>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <Suspense fallback={<div>Loading invoice...</div>}>
            <InvoiceForm
              workspaceSlug={params.workspaceSlug}
              invoiceId={params.invoiceId}
              mode="edit"
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}