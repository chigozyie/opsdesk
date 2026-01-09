import { z } from 'zod';

// Invoice status enum
export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'void']);

// Invoice line item schema
export const invoiceLineItemSchema = z.object({
  id: z.string().uuid({ message: 'Invalid line item ID' }),
  invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  quantity: z.number().positive({ message: 'Quantity must be positive' }),
  unit_price: z.number().nonnegative({ message: 'Unit price must be non-negative' }),
  total: z.number().nonnegative({ message: 'Total must be non-negative' }),
  sort_order: z.number().int().nonnegative().default(0),
  created_at: z.string(),
});

// Base invoice schema for database operations
export const invoiceSchema = z.object({
  id: z.string().uuid({ message: 'Invalid invoice ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  customer_id: z.string().uuid({ message: 'Invalid customer ID' }),
  invoice_number: z.string().min(1, 'Invoice number is required').max(50, 'Invoice number must be less than 50 characters'),
  status: invoiceStatusSchema.default('draft'),
  issue_date: z.string().date({ message: 'Please enter a valid date' }),
  due_date: z.string().date({ message: 'Please enter a valid date' }).optional().nullable(),
  subtotal: z.number().nonnegative({ message: 'Subtotal must be non-negative' }).default(0),
  tax_amount: z.number().nonnegative({ message: 'Tax amount must be non-negative' }).default(0),
  total_amount: z.number().nonnegative({ message: 'Total amount must be non-negative' }).default(0),
  notes: z.string().optional().nullable(),
  created_at: z.string(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }),
  updated_at: z.string(),
});

// Schema for creating invoice line items
export const createInvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  quantity: z.number().positive({ message: 'Quantity must be positive' }),
  unit_price: z.number().nonnegative({ message: 'Unit price must be non-negative' }),
  sort_order: z.number().int().nonnegative().default(0),
});

// Schema for updating invoice line items
export const updateInvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters').optional(),
  quantity: z.number().positive({ message: 'Quantity must be positive' }).optional(),
  unit_price: z.number().nonnegative({ message: 'Unit price must be non-negative' }).optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

// Schema for creating a new invoice
export const createInvoiceSchema = z.object({
  customer_id: z.string().uuid({ message: 'Please select a valid customer' }),
  invoice_number: z.string().min(1, 'Invoice number is required').max(50, 'Invoice number must be less than 50 characters'),
  issue_date: z.string().date({ message: 'Please enter a valid issue date' }),
  due_date: z.string().date({ message: 'Please enter a valid due date' }).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  line_items: z.array(createInvoiceLineItemSchema).min(1, 'At least one line item is required'),
}).transform((data) => ({
  ...data,
  due_date: data.due_date === '' ? null : data.due_date,
  notes: data.notes === '' ? null : data.notes,
}));

// Schema for updating an invoice
export const updateInvoiceSchema = z.object({
  customer_id: z.string().uuid({ message: 'Please select a valid customer' }).optional(),
  invoice_number: z.string().min(1, 'Invoice number is required').max(50, 'Invoice number must be less than 50 characters').optional(),
  status: invoiceStatusSchema.optional(),
  issue_date: z.string().date({ message: 'Please enter a valid issue date' }).optional(),
  due_date: z.string().date({ message: 'Please enter a valid due date' }).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  due_date: data.due_date === '' ? null : data.due_date,
  notes: data.notes === '' ? null : data.notes,
}));

// Schema for invoice filtering and search
export const invoiceFilterSchema = z.object({
  search: z.string().optional(),
  status: invoiceStatusSchema.optional(),
  customer_id: z.string().uuid({ message: 'Invalid customer ID' }).optional(),
  date_from: z.string().date({ message: 'Invalid start date' }).optional(),
  date_to: z.string().date({ message: 'Invalid end date' }).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Schema for invoice calculations
export const invoiceCalculationSchema = z.object({
  line_items: z.array(z.object({
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
  })),
  tax_rate: z.number().nonnegative().max(1).default(0), // Tax rate as decimal (0.1 = 10%)
});

// Type exports
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type CreateInvoiceData = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceData = z.infer<typeof updateInvoiceSchema>;
export type CreateInvoiceLineItemData = z.infer<typeof createInvoiceLineItemSchema>;
export type UpdateInvoiceLineItemData = z.infer<typeof updateInvoiceLineItemSchema>;
export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>;
export type InvoiceCalculation = z.infer<typeof invoiceCalculationSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;