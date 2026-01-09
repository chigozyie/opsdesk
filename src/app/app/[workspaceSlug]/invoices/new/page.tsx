import { InvoiceForm } from '@/components/invoice-form';

interface NewInvoicePageProps {
  params: {
    workspaceSlug: string;
  };
}

export default function NewInvoicePage({ params }: NewInvoicePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create Invoice</h1>
          <p className="text-sm text-gray-600">
            Create a new invoice for your customer
          </p>
        </div>
        <a
          href={`/app/${params.workspaceSlug}/invoices`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Invoices
        </a>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <InvoiceForm
            workspaceSlug={params.workspaceSlug}
            mode="create"
          />
        </div>
      </div>
    </div>
  );
}