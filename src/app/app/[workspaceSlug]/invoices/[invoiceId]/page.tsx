import { Suspense } from 'react';
import { InvoiceDetail } from '@/components/invoice-detail';

interface InvoiceDetailPageProps {
  params: {
    workspaceSlug: string;
    invoiceId: string;
  };
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoice Details</h1>
          <p className="text-sm text-gray-600">
            View and manage invoice information
          </p>
        </div>
        <div className="flex space-x-3">
          <a
            href={`/app/${params.workspaceSlug}/invoices/${params.invoiceId}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Invoice
          </a>
          <a
            href={`/app/${params.workspaceSlug}/invoices`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Invoices
          </a>
        </div>
      </div>

      <Suspense fallback={<div className="p-6">Loading invoice...</div>}>
        <InvoiceDetail
          workspaceSlug={params.workspaceSlug}
          invoiceId={params.invoiceId}
        />
      </Suspense>
    </div>
  );
}