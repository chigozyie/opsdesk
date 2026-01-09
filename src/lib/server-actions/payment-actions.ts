'use server';

import { z } from 'zod';
import { 
  createWorkspaceAction, 
  createSuccessResponse, 
  createErrorResponse, 
  handleDatabaseError,
  addAuditFields,
  type ServerActionContext,
  type EnhancedServerActionResult 
} from './index';
import { InvoiceCalculatorService } from '@/lib/services/invoice-calculator';

// Payment schema
const paymentSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string().date(),
  payment_method: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  created_at: z.string(),
  created_by: z.string().uuid(),
});

// Input schema for payment creation
const createPaymentInputSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }),
  amount: z.number().positive({ message: 'Payment amount must be positive' }),
  payment_date: z.string().date({ message: 'Please enter a valid payment date' }),
  payment_method: z.string().optional().or(z.literal('')),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  payment_method: data.payment_method === '' ? null : data.payment_method,
  reference: data.reference === '' ? null : data.reference,
  notes: data.notes === '' ? null : data.notes,
}));

// Input schema for payment update
const updatePaymentInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid payment ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  amount: z.number().positive({ message: 'Payment amount must be positive' }).optional(),
  payment_date: z.string().date({ message: 'Please enter a valid payment date' }).optional(),
  payment_method: z.string().optional().or(z.literal('')),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  payment_method: data.payment_method === '' ? null : data.payment_method,
  reference: data.reference === '' ? null : data.reference,
  notes: data.notes === '' ? null : data.notes,
}));

// Input schema for payment deletion
const deletePaymentInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid payment ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

export type Payment = z.infer<typeof paymentSchema>;
export type CreatePaymentData = z.infer<typeof createPaymentInputSchema>;
export type UpdatePaymentData = z.infer<typeof updatePaymentInputSchema>;

/**
 * Records a payment against an invoice
 */
export const recordPayment = createWorkspaceAction(
  createPaymentInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    payment: Payment;
    invoice: any;
    remainingBalance: number;
    isFullyPaid: boolean;
  }>> => {
    try {
      const { workspace_id, invoice_id, amount, ...paymentData } = input;

      // Check if invoice exists and belongs to workspace
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('id, total_amount, status')
        .eq('id', invoice_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!invoice) {
        return createErrorResponse('Invoice not found');
      }

      // Prevent payments on void invoices
      if ((invoice as any).status === 'void') {
        return createErrorResponse('Cannot record payments on void invoices');
      }

      // Calculate current paid amount
      const { data: existingPayments } = await context.supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', invoice_id);

      const currentPaidAmount = existingPayments?.reduce((sum, payment) => sum + (payment as any).amount, 0) || 0;
      const remainingBalance = InvoiceCalculatorService.calculateRemainingBalance(
        (invoice as any).total_amount,
        currentPaidAmount
      );

      // Validate payment amount
      if (amount > remainingBalance) {
        return createErrorResponse(
          `Payment amount (${amount.toFixed(2)}) exceeds remaining balance (${remainingBalance.toFixed(2)})`
        );
      }

      // Create payment record
      const paymentCreateData = addAuditFields(
        {
          workspace_id,
          invoice_id,
          amount,
          ...paymentData,
        },
        context.user.id
      );

      const { data: payment, error: paymentError } = await context.supabase
        .from('payments')
        .insert(paymentCreateData)
        .select()
        .single();

      if (paymentError) {
        return handleDatabaseError(paymentError, 'record payment');
      }

      // Calculate new balance
      const newPaidAmount = currentPaidAmount + amount;
      const newRemainingBalance = InvoiceCalculatorService.calculateRemainingBalance(
        (invoice as any).total_amount,
        newPaidAmount
      );
      const isFullyPaid = InvoiceCalculatorService.isFullyPaid((invoice as any).total_amount, newPaidAmount);

      // Update invoice status if fully paid
      if (isFullyPaid && (invoice as any).status !== 'paid') {
        const invoiceUpdateData = addAuditFields({ status: 'paid' as const }, context.user.id, true);
        await (context.supabase
          .from('invoices') as any)
          .update(invoiceUpdateData)
          .eq('id', invoice_id)
          .eq('workspace_id', workspace_id);
      }

      // Fetch updated invoice
      const { data: updatedInvoice } = await context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*),
          payments:payments(*)
        `)
        .eq('id', invoice_id)
        .single();

      return createSuccessResponse({
        payment: payment as Payment,
        invoice: updatedInvoice,
        remainingBalance: newRemainingBalance,
        isFullyPaid,
      }, 'Payment recorded successfully');
    } catch (error) {
      console.error('Error recording payment:', error);
      return createErrorResponse('Failed to record payment');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'record_payment',
    auditResourceType: 'payment',
  }
);

/**
 * Updates an existing payment
 */
export const updatePayment = createWorkspaceAction(
  updatePaymentInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    payment: Payment;
    invoice: any;
    remainingBalance: number;
    isFullyPaid: boolean;
  }>> => {
    try {
      const { id, workspace_id, ...updateData } = input;

      // Check if payment exists and belongs to workspace
      const { data: existingPayment } = await context.supabase
        .from('payments')
        .select('id, invoice_id, amount')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingPayment) {
        return createErrorResponse('Payment not found');
      }

      // Get invoice details
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('id, total_amount, status')
        .eq('id', (existingPayment as any).invoice_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!invoice) {
        return createErrorResponse('Associated invoice not found');
      }

      // Prevent updates on void invoices
      if ((invoice as any).status === 'void') {
        return createErrorResponse('Cannot update payments on void invoices');
      }

      // If amount is being updated, validate the new total
      if (updateData.amount !== undefined) {
        // Calculate current paid amount excluding this payment
        const { data: otherPayments } = await context.supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', (existingPayment as any).invoice_id)
          .neq('id', id);

        const otherPaidAmount = otherPayments?.reduce((sum, payment) => sum + (payment as any).amount, 0) || 0;
        const newTotalPaid = otherPaidAmount + updateData.amount;

        if (newTotalPaid > (invoice as any).total_amount) {
          const maxAllowed = (invoice as any).total_amount - otherPaidAmount;
          return createErrorResponse(
            `Payment amount (${updateData.amount.toFixed(2)}) would exceed invoice total. Maximum allowed: ${maxAllowed.toFixed(2)}`
          );
        }
      }

      // Update payment
      const { data: payment, error: updateError } = await (context.supabase
        .from('payments') as any)
        .update(updateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

      if (updateError) {
        return handleDatabaseError(updateError, 'update payment');
      }

      // Recalculate invoice payment status
      const { data: allPayments } = await context.supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', (existingPayment as any).invoice_id);

      const totalPaidAmount = allPayments?.reduce((sum, payment) => sum + (payment as any).amount, 0) || 0;
      const remainingBalance = InvoiceCalculatorService.calculateRemainingBalance(
        (invoice as any).total_amount,
        totalPaidAmount
      );
      const isFullyPaid = InvoiceCalculatorService.isFullyPaid((invoice as any).total_amount, totalPaidAmount);

      // Update invoice status based on payment status
      const newStatus = isFullyPaid ? 'paid' : ((invoice as any).status === 'paid' ? 'sent' : (invoice as any).status);
      if (newStatus !== (invoice as any).status) {
        const invoiceUpdateData = addAuditFields({ status: newStatus as any }, context.user.id, true);
        await (context.supabase
          .from('invoices') as any)
          .update(invoiceUpdateData)
          .eq('id', (existingPayment as any).invoice_id)
          .eq('workspace_id', workspace_id);
      }

      // Fetch updated invoice
      const { data: updatedInvoice } = await context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*),
          payments:payments(*)
        `)
        .eq('id', (existingPayment as any).invoice_id)
        .single();

      return createSuccessResponse({
        payment: payment as Payment,
        invoice: updatedInvoice,
        remainingBalance,
        isFullyPaid,
      }, 'Payment updated successfully');
    } catch (error) {
      console.error('Error updating payment:', error);
      return createErrorResponse('Failed to update payment');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'update_payment',
    auditResourceType: 'payment',
  }
);

/**
 * Deletes a payment record
 */
export const deletePayment = createWorkspaceAction(
  deletePaymentInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    invoice: any;
    remainingBalance: number;
    isFullyPaid: boolean;
  }>> => {
    try {
      const { id, workspace_id } = input;

      // Check if payment exists and belongs to workspace
      const { data: existingPayment } = await context.supabase
        .from('payments')
        .select('id, invoice_id, amount')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingPayment) {
        return createErrorResponse('Payment not found');
      }

      // Get invoice details
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('id, total_amount, status')
        .eq('id', (existingPayment as any).invoice_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!invoice) {
        return createErrorResponse('Associated invoice not found');
      }

      // Delete payment
      const { error: deleteError } = await context.supabase
        .from('payments')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspace_id);

      if (deleteError) {
        return handleDatabaseError(deleteError, 'delete payment');
      }

      // Recalculate invoice payment status
      const { data: remainingPayments } = await context.supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', (existingPayment as any).invoice_id);

      const totalPaidAmount = remainingPayments?.reduce((sum, payment) => sum + (payment as any).amount, 0) || 0;
      const remainingBalance = InvoiceCalculatorService.calculateRemainingBalance(
        (invoice as any).total_amount,
        totalPaidAmount
      );
      const isFullyPaid = InvoiceCalculatorService.isFullyPaid((invoice as any).total_amount, totalPaidAmount);

      // Update invoice status based on payment status
      const newStatus = isFullyPaid ? 'paid' : ((invoice as any).status === 'paid' ? 'sent' : (invoice as any).status);
      if (newStatus !== (invoice as any).status) {
        const invoiceUpdateData = addAuditFields({ status: newStatus as any }, context.user.id, true);
        await (context.supabase
          .from('invoices') as any)
          .update(invoiceUpdateData)
          .eq('id', (existingPayment as any).invoice_id)
          .eq('workspace_id', workspace_id);
      }

      // Fetch updated invoice
      const { data: updatedInvoice } = await context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*),
          payments:payments(*)
        `)
        .eq('id', (existingPayment as any).invoice_id)
        .single();

      return createSuccessResponse({
        invoice: updatedInvoice,
        remainingBalance,
        isFullyPaid,
      }, 'Payment deleted successfully');
    } catch (error) {
      console.error('Error deleting payment:', error);
      return createErrorResponse('Failed to delete payment');
    }
  },
  {
    requiredRole: 'admin',
    auditAction: 'delete_payment',
    auditResourceType: 'payment',
  }
);

/**
 * Gets payments for an invoice
 */
export const getInvoicePayments = createWorkspaceAction(
  z.object({
    invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }),
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    payments: Payment[];
    totalPaid: number;
    remainingBalance: number;
    isFullyPaid: boolean;
    invoiceTotal: number;
  }>> => {
    try {
      const { invoice_id, workspace_id } = input;

      // Check if invoice exists and belongs to workspace
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('id, total_amount')
        .eq('id', invoice_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!invoice) {
        return createErrorResponse('Invoice not found');
      }

      // Get payments for the invoice
      const { data: payments, error } = await context.supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoice_id)
        .eq('workspace_id', workspace_id)
        .order('payment_date', { ascending: false });

      if (error) {
        return handleDatabaseError(error, 'fetch payments');
      }

      // Calculate totals
      const totalPaid = payments?.reduce((sum, payment) => sum + (payment as any).amount, 0) || 0;
      const remainingBalance = InvoiceCalculatorService.calculateRemainingBalance(
        (invoice as any).total_amount,
        totalPaid
      );
      const isFullyPaid = InvoiceCalculatorService.isFullyPaid((invoice as any).total_amount, totalPaid);

      return createSuccessResponse({
        payments: payments as Payment[],
        totalPaid,
        remainingBalance,
        isFullyPaid,
        invoiceTotal: (invoice as any).total_amount,
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      return createErrorResponse('Failed to fetch payments');
    }
  },
  {
    requiredRole: 'viewer',
  }
);