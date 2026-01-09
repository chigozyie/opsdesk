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
import { 
  createInvoiceSchema, 
  updateInvoiceSchema, 
  invoiceFilterSchema,
  invoiceStatusSchema,
  type Invoice,
  type InvoiceStatus 
} from '@/lib/validation/schemas/invoice';

// Input schema for invoice creation with workspace context
const createInvoiceInputSchema = createInvoiceSchema.extend({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for invoice update with IDs
const updateInvoiceInputSchema = updateInvoiceSchema.extend({
  id: z.string().uuid({ message: 'Invalid invoice ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for invoice status update
const updateInvoiceStatusInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid invoice ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  status: invoiceStatusSchema,
});

// Input schema for line item creation
const createLineItemInputSchema = z.object({
  invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  quantity: z.number().positive({ message: 'Quantity must be positive' }),
  unit_price: z.number().nonnegative({ message: 'Unit price must be non-negative' }),
  sort_order: z.number().int().nonnegative().default(0),
});

// Input schema for line item update
const updateLineItemInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid line item ID' }),
  invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters').optional(),
  quantity: z.number().positive({ message: 'Quantity must be positive' }).optional(),
  unit_price: z.number().nonnegative({ message: 'Unit price must be non-negative' }).optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

// Input schema for line item deletion
const deleteLineItemInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid line item ID' }),
  invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for invoice deletion
const deleteInvoiceInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid invoice ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

import { InvoiceCalculatorService } from '@/lib/services/invoice-calculator';

/**
 * Creates a new invoice with line items
 */
export const createInvoice = createWorkspaceAction(
  createInvoiceInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { line_items, workspace_id, ...invoiceData } = input;

      // Verify customer belongs to workspace
      const { data: customer } = await context.supabase
        .from('customers')
        .select('id')
        .eq('id', invoiceData.customer_id)
        .eq('workspace_id', workspace_id)
        .eq('archived', false)
        .single();

      if (!customer) {
        return createErrorResponse('Customer not found or is archived');
      }

      // Check if invoice number already exists in workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('invoice_number', invoiceData.invoice_number)
        .single();

      if (existingInvoice) {
        return createErrorResponse('An invoice with this number already exists in your workspace');
      }

      // Calculate invoice totals
      const totals = InvoiceCalculatorService.calculateInvoiceTotals({
        line_items,
        tax_rate: 0, // Default tax rate, can be made configurable later
      });

      // Create invoice with audit fields
      const invoiceCreateData = addAuditFields(
        {
          workspace_id,
          ...invoiceData,
          ...totals,
          status: 'draft' as InvoiceStatus,
        },
        context.user.id
      );

      const { data: invoice, error: invoiceError } = await context.supabase
        .from('invoices')
        .insert(invoiceCreateData)
        .select()
        .single();

      if (invoiceError) {
        return handleDatabaseError(invoiceError, 'create invoice');
      }

      // Create line items with calculated totals
      const lineItemsData = line_items.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: InvoiceCalculatorService.calculateLineItemTotal(item.quantity, item.unit_price),
        sort_order: item.sort_order || index,
        created_at: new Date().toISOString(),
      }));

      const { error: lineItemsError } = await context.supabase
        .from('invoice_line_items')
        .insert(lineItemsData);

      if (lineItemsError) {
        // Rollback invoice creation
        await context.supabase.from('invoices').delete().eq('id', invoice.id);
        return handleDatabaseError(lineItemsError, 'create invoice line items');
      }

      // Fetch complete invoice with line items
      const { data: completeInvoice } = await context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .eq('id', invoice.id)
        .single();

      return createSuccessResponse(completeInvoice as Invoice, 'Invoice created successfully');
    } catch (error) {
      console.error('Error creating invoice:', error);
      return createErrorResponse('Failed to create invoice');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'create',
    auditResourceType: 'invoice',
  }
);

/**
 * Updates an existing invoice
 */
export const updateInvoice = createWorkspaceAction(
  updateInvoiceInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { id, workspace_id, ...updateData } = input;

      // Check if invoice exists and belongs to workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id, status, invoice_number')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingInvoice) {
        return createErrorResponse('Invoice not found');
      }

      // Prevent editing paid or void invoices
      if (existingInvoice.status === 'paid' || existingInvoice.status === 'void') {
        return createErrorResponse('Cannot edit paid or void invoices');
      }

      // Check for invoice number conflicts if number is being updated
      if (updateData.invoice_number && updateData.invoice_number !== existingInvoice.invoice_number) {
        const { data: numberConflict } = await context.supabase
          .from('invoices')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('invoice_number', updateData.invoice_number)
          .neq('id', id)
          .single();

        if (numberConflict) {
          return createErrorResponse('An invoice with this number already exists in your workspace');
        }
      }

      // Verify customer belongs to workspace if customer is being updated
      if (updateData.customer_id) {
        const { data: customer } = await context.supabase
          .from('customers')
          .select('id')
          .eq('id', updateData.customer_id)
          .eq('workspace_id', workspace_id)
          .eq('archived', false)
          .single();

        if (!customer) {
          return createErrorResponse('Customer not found or is archived');
        }
      }

      // Update invoice with audit fields
      const invoiceUpdateData = addAuditFields(updateData, context.user.id, true);

      const { data: invoice, error } = await context.supabase
        .from('invoices')
        .update(invoiceUpdateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .single();

      if (error) {
        return handleDatabaseError(error, 'update invoice');
      }

      return createSuccessResponse(invoice as Invoice, 'Invoice updated successfully');
    } catch (error) {
      console.error('Error updating invoice:', error);
      return createErrorResponse('Failed to update invoice');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'update',
    auditResourceType: 'invoice',
  }
);

/**
 * Updates invoice status
 */
export const updateInvoiceStatus = createWorkspaceAction(
  updateInvoiceStatusInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { id, workspace_id, status } = input;

      // Check if invoice exists and belongs to workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id, status')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingInvoice) {
        return createErrorResponse('Invoice not found');
      }

      if (existingInvoice.status === status) {
        return createErrorResponse(`Invoice is already ${status}`);
      }

      // Validate status transitions
      const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
        draft: ['sent', 'void'],
        sent: ['paid', 'void'],
        paid: [], // Paid invoices cannot be changed
        void: [], // Void invoices cannot be changed
      };

      if (!validTransitions[existingInvoice.status as InvoiceStatus].includes(status)) {
        return createErrorResponse(`Cannot change invoice status from ${existingInvoice.status} to ${status}`);
      }

      // Update status with audit fields
      const updateData = addAuditFields({ status }, context.user.id, true);

      const { data: invoice, error } = await context.supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .single();

      if (error) {
        return handleDatabaseError(error, 'update invoice status');
      }

      return createSuccessResponse(invoice as Invoice, `Invoice status updated to ${status}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      return createErrorResponse('Failed to update invoice status');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'update_status',
    auditResourceType: 'invoice',
  }
);

/**
 * Recalculates invoice totals based on line items
 */
export const recalculateInvoice = createWorkspaceAction(
  z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID' }),
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
    tax_rate: z.number().nonnegative().max(1).default(0),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { id, workspace_id, tax_rate } = input;

      // Check if invoice exists and belongs to workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id, status')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingInvoice) {
        return createErrorResponse('Invoice not found');
      }

      // Prevent recalculating paid or void invoices
      if (existingInvoice.status === 'paid' || existingInvoice.status === 'void') {
        return createErrorResponse('Cannot recalculate paid or void invoices');
      }

      // Get line items
      const { data: lineItems } = await context.supabase
        .from('invoice_line_items')
        .select('quantity, unit_price')
        .eq('invoice_id', id);

      if (!lineItems || lineItems.length === 0) {
        return createErrorResponse('Invoice has no line items to calculate');
      }

      // Calculate new totals
      const totals = InvoiceCalculatorService.calculateInvoiceTotals({
        line_items: lineItems,
        tax_rate,
      });

      // Update invoice totals
      const updateData = addAuditFields(totals, context.user.id, true);

      const { data: invoice, error } = await context.supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .single();

      if (error) {
        return handleDatabaseError(error, 'recalculate invoice');
      }

      return createSuccessResponse(invoice as Invoice, 'Invoice totals recalculated successfully');
    } catch (error) {
      console.error('Error recalculating invoice:', error);
      return createErrorResponse('Failed to recalculate invoice');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'recalculate',
    auditResourceType: 'invoice',
  }
);

/**
 * Gets invoices for a workspace with filtering and pagination
 */
export const getInvoices = createWorkspaceAction(
  invoiceFilterSchema.extend({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    invoices: Invoice[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>> => {
    try {
      const { workspace_id, search, status, customer_id, date_from, date_to, page, limit } = input;
      const offset = (page - 1) * limit;

      let query = context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email),
          line_items:invoice_line_items(*)
        `, { count: 'exact' })
        .eq('workspace_id', workspace_id);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }

      if (date_from) {
        query = query.gte('issue_date', date_from);
      }

      if (date_to) {
        query = query.lte('issue_date', date_to);
      }

      if (search) {
        query = query.or(`invoice_number.ilike.%${search}%,notes.ilike.%${search}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: invoices, error, count } = await query;

      if (error) {
        return handleDatabaseError(error, 'fetch invoices');
      }

      const total = count || 0;
      const hasMore = offset + limit < total;

      return createSuccessResponse({
        invoices: invoices as Invoice[],
        total,
        page,
        limit,
        hasMore,
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return createErrorResponse('Failed to fetch invoices');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets a single invoice by ID
 */
export const getInvoice = createWorkspaceAction(
  z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID' }),
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { id, workspace_id } = input;

      const { data: invoice, error } = await context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*),
          payments:payments(*)
        `)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (error || !invoice) {
        return createErrorResponse('Invoice not found');
      }

      return createSuccessResponse(invoice as Invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return createErrorResponse('Failed to fetch invoice');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Adds a new line item to an existing invoice
 */
export const addInvoiceLineItem = createWorkspaceAction(
  createLineItemInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { invoice_id, workspace_id, ...lineItemData } = input;

      // Check if invoice exists and belongs to workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id, status')
        .eq('id', invoice_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingInvoice) {
        return createErrorResponse('Invoice not found');
      }

      // Prevent editing paid or void invoices
      if (existingInvoice.status === 'paid' || existingInvoice.status === 'void') {
        return createErrorResponse('Cannot edit paid or void invoices');
      }

      // Calculate line item total
      const total = InvoiceCalculatorService.calculateLineItemTotal(
        lineItemData.quantity,
        lineItemData.unit_price
      );

      // Create line item
      const { error: lineItemError } = await context.supabase
        .from('invoice_line_items')
        .insert({
          invoice_id,
          description: lineItemData.description,
          quantity: lineItemData.quantity,
          unit_price: lineItemData.unit_price,
          total,
          sort_order: lineItemData.sort_order,
          created_at: new Date().toISOString(),
        });

      if (lineItemError) {
        return handleDatabaseError(lineItemError, 'add line item');
      }

      // Recalculate invoice totals
      const { data: lineItems } = await context.supabase
        .from('invoice_line_items')
        .select('quantity, unit_price')
        .eq('invoice_id', invoice_id);

      if (lineItems) {
        const totals = InvoiceCalculatorService.calculateInvoiceTotals({
          line_items: lineItems,
          tax_rate: 0, // Default tax rate
        });

        // Update invoice totals
        const updateData = addAuditFields(totals, context.user.id, true);
        await context.supabase
          .from('invoices')
          .update(updateData)
          .eq('id', invoice_id)
          .eq('workspace_id', workspace_id);
      }

      // Fetch updated invoice
      const { data: updatedInvoice } = await context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .eq('id', invoice_id)
        .single();

      return createSuccessResponse(updatedInvoice as Invoice, 'Line item added successfully');
    } catch (error) {
      console.error('Error adding line item:', error);
      return createErrorResponse('Failed to add line item');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'add_line_item',
    auditResourceType: 'invoice',
  }
);

/**
 * Updates an existing invoice line item
 */
export const updateInvoiceLineItem = createWorkspaceAction(
  updateLineItemInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { id, invoice_id, workspace_id, ...updateData } = input;

      // Check if invoice exists and belongs to workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id, status')
        .eq('id', invoice_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingInvoice) {
        return createErrorResponse('Invoice not found');
      }

      // Prevent editing paid or void invoices
      if (existingInvoice.status === 'paid' || existingInvoice.status === 'void') {
        return createErrorResponse('Cannot edit paid or void invoices');
      }

      // Check if line item exists
      const { data: existingLineItem } = await context.supabase
        .from('invoice_line_items')
        .select('id')
        .eq('id', id)
        .eq('invoice_id', invoice_id)
        .single();

      if (!existingLineItem) {
        return createErrorResponse('Line item not found');
      }

      // Calculate new total if quantity or unit_price changed
      let lineItemUpdateData = { ...updateData };
      if (updateData.quantity !== undefined || updateData.unit_price !== undefined) {
        // Get current values for calculation
        const { data: currentLineItem } = await context.supabase
          .from('invoice_line_items')
          .select('quantity, unit_price')
          .eq('id', id)
          .single();

        if (currentLineItem) {
          const quantity = updateData.quantity ?? currentLineItem.quantity;
          const unitPrice = updateData.unit_price ?? currentLineItem.unit_price;
          const total = InvoiceCalculatorService.calculateLineItemTotal(quantity, unitPrice);
          lineItemUpdateData = { ...lineItemUpdateData, total };
        }
      }

      // Update line item
      const { error: updateError } = await context.supabase
        .from('invoice_line_items')
        .update(lineItemUpdateData)
        .eq('id', id)
        .eq('invoice_id', invoice_id);

      if (updateError) {
        return handleDatabaseError(updateError, 'update line item');
      }

      // Recalculate invoice totals
      const { data: lineItems } = await context.supabase
        .from('invoice_line_items')
        .select('quantity, unit_price')
        .eq('invoice_id', invoice_id);

      if (lineItems) {
        const totals = InvoiceCalculatorService.calculateInvoiceTotals({
          line_items: lineItems,
          tax_rate: 0, // Default tax rate
        });

        // Update invoice totals
        const invoiceUpdateData = addAuditFields(totals, context.user.id, true);
        await context.supabase
          .from('invoices')
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
          line_items:invoice_line_items(*)
        `)
        .eq('id', invoice_id)
        .single();

      return createSuccessResponse(updatedInvoice as Invoice, 'Line item updated successfully');
    } catch (error) {
      console.error('Error updating line item:', error);
      return createErrorResponse('Failed to update line item');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'update_line_item',
    auditResourceType: 'invoice',
  }
);

/**
 * Removes a line item from an invoice
 */
export const removeInvoiceLineItem = createWorkspaceAction(
  deleteLineItemInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Invoice>> => {
    try {
      const { id, invoice_id, workspace_id } = input;

      // Check if invoice exists and belongs to workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id, status')
        .eq('id', invoice_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingInvoice) {
        return createErrorResponse('Invoice not found');
      }

      // Prevent editing paid or void invoices
      if (existingInvoice.status === 'paid' || existingInvoice.status === 'void') {
        return createErrorResponse('Cannot edit paid or void invoices');
      }

      // Check if line item exists
      const { data: existingLineItem } = await context.supabase
        .from('invoice_line_items')
        .select('id')
        .eq('id', id)
        .eq('invoice_id', invoice_id)
        .single();

      if (!existingLineItem) {
        return createErrorResponse('Line item not found');
      }

      // Check if this is the last line item
      const { data: allLineItems } = await context.supabase
        .from('invoice_line_items')
        .select('id')
        .eq('invoice_id', invoice_id);

      if (allLineItems && allLineItems.length <= 1) {
        return createErrorResponse('Cannot remove the last line item from an invoice');
      }

      // Delete line item
      const { error: deleteError } = await context.supabase
        .from('invoice_line_items')
        .delete()
        .eq('id', id)
        .eq('invoice_id', invoice_id);

      if (deleteError) {
        return handleDatabaseError(deleteError, 'remove line item');
      }

      // Recalculate invoice totals
      const { data: remainingLineItems } = await context.supabase
        .from('invoice_line_items')
        .select('quantity, unit_price')
        .eq('invoice_id', invoice_id);

      if (remainingLineItems) {
        const totals = InvoiceCalculatorService.calculateInvoiceTotals({
          line_items: remainingLineItems,
          tax_rate: 0, // Default tax rate
        });

        // Update invoice totals
        const updateData = addAuditFields(totals, context.user.id, true);
        await context.supabase
          .from('invoices')
          .update(updateData)
          .eq('id', invoice_id)
          .eq('workspace_id', workspace_id);
      }

      // Fetch updated invoice
      const { data: updatedInvoice } = await context.supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .eq('id', invoice_id)
        .single();

      return createSuccessResponse(updatedInvoice as Invoice, 'Line item removed successfully');
    } catch (error) {
      console.error('Error removing line item:', error);
      return createErrorResponse('Failed to remove line item');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'remove_line_item',
    auditResourceType: 'invoice',
  }
);

/**
 * Calculates invoice totals in real-time (for form updates)
 */
export const calculateInvoiceTotals = createWorkspaceAction(
  z.object({
    line_items: z.array(z.object({
      quantity: z.number().positive(),
      unit_price: z.number().nonnegative(),
    })).min(1, 'At least one line item is required'),
    tax_rate: z.number().nonnegative().max(1).default(0),
  }),
  async (input): Promise<EnhancedServerActionResult<{
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    line_items: Array<{
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  }>> => {
    try {
      const { line_items, tax_rate } = input;

      // Validate line items
      const validationErrors = InvoiceCalculatorService.validateLineItems(line_items);
      if (validationErrors.length > 0) {
        return createErrorResponse(validationErrors.join(', '));
      }

      // Calculate totals
      const result = InvoiceCalculatorService.calculateInvoiceTotals({
        line_items,
        tax_rate,
      });

      return createSuccessResponse(result);
    } catch (error) {
      console.error('Error calculating invoice totals:', error);
      return createErrorResponse('Failed to calculate invoice totals');
    }
  },
  {
    requiredRole: 'member',
  }
);

/**
 * Deletes an invoice (admin only)
 */
export const deleteInvoice = createWorkspaceAction(
  deleteInvoiceInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<void>> => {
    try {
      const { id, workspace_id } = input;

      // Check if invoice exists and belongs to workspace
      const { data: existingInvoice } = await context.supabase
        .from('invoices')
        .select('id, status')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingInvoice) {
        return createErrorResponse('Invoice not found');
      }

      // Prevent deleting paid invoices
      if (existingInvoice.status === 'paid') {
        return createErrorResponse('Cannot delete paid invoices');
      }

      // Check if invoice has payments
      const { data: payments } = await context.supabase
        .from('payments')
        .select('id')
        .eq('invoice_id', id)
        .limit(1);

      if (payments && payments.length > 0) {
        return createErrorResponse('Cannot delete invoice with recorded payments');
      }

      // Delete invoice (line items will be deleted by cascade)
      const { error } = await context.supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspace_id);

      if (error) {
        return handleDatabaseError(error, 'delete invoice');
      }

      return createSuccessResponse(undefined, 'Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return createErrorResponse('Failed to delete invoice');
    }
  },
  {
    requiredRole: 'admin',
    auditAction: 'delete',
    auditResourceType: 'invoice',
  }
);