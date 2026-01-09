'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoice, updateInvoice, getInvoice, calculateInvoiceTotals } from '@/lib/server-actions/invoice-actions';
import { getCustomers } from '@/lib/server-actions/customer-actions';
import type { Customer } from '@/lib/validation/schemas/customer';

interface InvoiceFormProps {
  workspaceSlug: string;
  invoiceId?: string;
  mode: 'create' | 'edit';
}

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface FormData {
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  notes: string;
  line_items: LineItem[];
}

interface CalculatedTotals {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

export function InvoiceForm({ workspaceSlug, invoiceId, mode }: InvoiceFormProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedTotals, setCalculatedTotals] = useState<CalculatedTotals>({
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0] || '',
    due_date: '',
    notes: '',
    line_items: [
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ],
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Recalculate totals when line items change
    recalculateTotals();
  }, [formData.line_items]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load customers
      const workspaceId = 'temp-workspace-id'; // This would come from workspace context
      const customersResult = await getCustomers({
        workspace_id: workspaceId,
        page: 1,
        limit: 100,
      });

      if (customersResult.success && customersResult.data) {
        setCustomers(customersResult.data.customers);
      }

      // Load existing invoice if editing
      if (mode === 'edit' && invoiceId) {
        const invoiceResult = await getInvoice({
          id: invoiceId,
          workspace_id: workspaceId,
        });

        if (invoiceResult.success && invoiceResult.data) {
          const invoice = invoiceResult.data;
          setFormData({
            customer_id: invoice.customer_id,
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date || '',
            notes: invoice.notes || '',
            line_items: (invoice as any).line_items?.map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
            })) || [],
          });
        }
      }
    } catch (error) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const recalculateTotals = async () => {
    if (formData.line_items.length === 0 || formData.line_items.every(item => !item.description)) {
      setCalculatedTotals({ subtotal: 0, tax_amount: 0, total_amount: 0 });
      return;
    }

    try {
      const result = await calculateInvoiceTotals({
        line_items: formData.line_items.map(item => ({
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        tax_rate: 0, // Default tax rate
      });

      if (result.success && result.data) {
        setCalculatedTotals({
          subtotal: result.data.subtotal,
          tax_amount: result.data.tax_amount,
          total_amount: result.data.total_amount,
        });

        // Update line item totals
        setFormData(prev => ({
          ...prev,
          line_items: prev.line_items.map((item, index) => ({
            ...item,
            total: result.data!.line_items[index]?.total || 0,
          })),
        }));
      }
    } catch (error) {
      console.error('Error calculating totals:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          total: 0,
        },
      ],
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.line_items.length > 1) {
      setFormData(prev => ({
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const workspaceId = 'temp-workspace-id'; // This would come from workspace context
      
      const submitData = {
        workspace_id: workspaceId,
        customer_id: formData.customer_id,
        invoice_number: formData.invoice_number,
        issue_date: formData.issue_date,
        due_date: formData.due_date || undefined,
        notes: formData.notes || undefined,
        line_items: formData.line_items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          sort_order: 0,
        })),
      };

      let result;
      if (mode === 'create') {
        result = await createInvoice(submitData);
      } else {
        result = await updateInvoice({
          id: invoiceId!,
          ...submitData,
        });
      }

      if (result.success) {
        router.push(`/app/${workspaceSlug}/invoices/${result.data?.id || invoiceId}`);
      } else {
        setError(result.message || 'Failed to save invoice');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Invoice Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
            Customer *
          </label>
          <select
            id="customer_id"
            required
            value={formData.customer_id}
            onChange={(e) => handleInputChange('customer_id', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Number *
          </label>
          <input
            type="text"
            id="invoice_number"
            required
            value={formData.invoice_number}
            onChange={(e) => handleInputChange('invoice_number', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
            Issue Date *
          </label>
          <input
            type="date"
            id="issue_date"
            required
            value={formData.issue_date}
            onChange={(e) => handleInputChange('issue_date', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            id="due_date"
            value={formData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
          <button
            type="button"
            onClick={addLineItem}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {formData.line_items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={item.description}
                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                  {formatCurrency(item.total)}
                </div>
              </div>

              <div className="col-span-1">
                {formData.line_items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">{formatCurrency(calculatedTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="text-gray-900">{formatCurrency(calculatedTotals.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-medium border-t pt-2">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">{formatCurrency(calculatedTotals.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Additional notes or terms..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
        </button>
      </div>
    </form>
  );
}