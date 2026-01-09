'use client';

import { useState, useEffect } from 'react';
import { getInvoice, updateInvoiceStatus } from '@/lib/server-actions/invoice-actions';
import { getInvoicePayments, recordPayment } from '@/lib/server-actions/payment-actions';
import type { Invoice } from '@/lib/validation/schemas/invoice';
import type { Payment } from '@/lib/server-actions/payment-actions';

interface InvoiceDetailProps {
  workspaceSlug: string;
  invoiceId: string;
}

interface PaymentFormData {
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string;
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState({
    totalPaid: 0,
    remainingBalance: 0,
    isFullyPaid: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0] || '',
    payment_method: '',
    reference: '',
    notes: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const workspaceId = 'temp-workspace-id'; // This would come from workspace context

      // Load invoice details
      const invoiceResult = await getInvoice({
        id: invoiceId,
        workspace_id: workspaceId,
      });

      if (!invoiceResult.success || !invoiceResult.data) {
        setError(invoiceResult.message || 'Failed to load invoice');
        return;
      }

      setInvoice(invoiceResult.data);

      // Load payment information
      const paymentsResult = await getInvoicePayments({
        invoice_id: invoiceId,
        workspace_id: workspaceId,
      });

      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data.payments);
        setPaymentSummary({
          totalPaid: paymentsResult.data.totalPaid,
          remainingBalance: paymentsResult.data.remainingBalance,
          isFullyPaid: paymentsResult.data.isFullyPaid,
        });

        // Set default payment amount to remaining balance
        setPaymentFormData(prev => ({
          ...prev,
          amount: paymentsResult.data?.remainingBalance || 0,
        }));
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!invoice) return;

    try {
      setUpdatingStatus(true);
      const workspaceId = 'temp-workspace-id'; // This would come from workspace context

      const result = await updateInvoiceStatus({
        id: invoiceId,
        workspace_id: workspaceId,
        status: newStatus as any,
      });

      if (result.success && result.data) {
        setInvoice(result.data);
      } else {
        setError(result.message || 'Failed to update invoice status');
      }
    } catch (error) {
      setError('Failed to update invoice status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    try {
      setSubmittingPayment(true);
      setError(null);

      const workspaceId = 'temp-workspace-id'; // This would come from workspace context

      const result = await recordPayment({
        workspace_id: workspaceId,
        invoice_id: invoiceId,
        amount: paymentFormData.amount,
        payment_date: paymentFormData.payment_date,
        payment_method: paymentFormData.payment_method || undefined,
        reference: paymentFormData.reference || undefined,
        notes: paymentFormData.notes || undefined,
      });

      if (result.success && result.data) {
        // Update local state
        setInvoice(result.data.invoice);
        setPayments(prev => [result.data!.payment, ...prev]);
        setPaymentSummary({
          totalPaid: paymentSummary.totalPaid + paymentFormData.amount,
          remainingBalance: result.data.remainingBalance,
          isFullyPaid: result.data.isFullyPaid,
        });

        // Reset form
        setPaymentFormData({
          amount: result.data.remainingBalance,
          payment_date: new Date().toISOString().split('T')[0] || '',
          payment_method: '',
          reference: '',
          notes: '',
        });
        setShowPaymentForm(false);
      } else {
        setError(result.message || 'Failed to record payment');
      }
    } catch (error) {
      setError('Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getAvailableStatusTransitions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      draft: ['sent', 'void'],
      sent: ['paid', 'void'],
      paid: [],
      void: [],
    };
    return transitions[currentStatus] || [];
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-sm text-red-600 mb-2">Error loading invoice</div>
        <div className="text-sm text-gray-600 mb-4">{error}</div>
        <button
          onClick={loadInvoiceData}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Invoice Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Invoice {invoice.invoice_number}
              </h2>
              <div className="mt-1 flex items-center space-x-4">
                {getStatusBadge(invoice.status)}
                <span className="text-sm text-gray-500">
                  Issued {formatDate(invoice.issue_date)}
                </span>
                {invoice.due_date && (
                  <span className="text-sm text-gray-500">
                    Due {formatDate(invoice.due_date)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Status Update Dropdown */}
              {getAvailableStatusTransitions(invoice.status).length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && handleStatusUpdate(e.target.value)}
                  disabled={updatingStatus}
                  title="Change invoice status"
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Change Status</option>
                  {getAvailableStatusTransitions(invoice.status).map((status) => (
                    <option key={status} value={status}>
                      Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Bill To</h3>
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-900">
                  {(invoice as any).customer?.name || 'Unknown Customer'}
                </div>
                {(invoice as any).customer?.email && (
                  <div>{(invoice as any).customer.email}</div>
                )}
                {(invoice as any).customer?.phone && (
                  <div>{(invoice as any).customer.phone}</div>
                )}
                {(invoice as any).customer?.address && (
                  <div className="mt-1 whitespace-pre-line">
                    {(invoice as any).customer.address}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Payment Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Total:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="text-gray-900">{formatCurrency(paymentSummary.totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium text-gray-900">Balance Due:</span>
                  <span className={`font-medium ${paymentSummary.isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(paymentSummary.remainingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
              <div className="text-sm text-gray-600 whitespace-pre-line">
                {invoice.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(invoice as any).line_items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Totals */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-medium border-t pt-2">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
            {!paymentSummary.isFullyPaid && invoice.status !== 'void' && (
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    required
                    min="0.01"
                    max={paymentSummary.remainingBalance}
                    step="0.01"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    id="payment_date"
                    required
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    id="payment_method"
                    placeholder="Cash, Check, Credit Card, etc."
                    value={paymentFormData.payment_method}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
                    Reference
                  </label>
                  <input
                    type="text"
                    id="reference"
                    placeholder="Check number, transaction ID, etc."
                    value={paymentFormData.reference}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  placeholder="Additional payment notes..."
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment List */}
        <div className="px-6 py-4">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">No payments recorded</div>
              <div className="text-sm text-gray-400">
                {invoice.status === 'void' 
                  ? 'This invoice has been voided'
                  : 'Record a payment to track payment history'
                }
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_method || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.reference || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {payment.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}