import { z } from 'zod';

// Base payment schema for database operations
export const paymentSchema = z.object({
  id: z.string().uuid({ message: 'Invalid payment ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }),
  amount: z.number().positive({ message: 'Payment amount must be positive' }),
  payment_date: z.string().date({ message: 'Please enter a valid payment date' }),
  payment_method: z.string().max(50, 'Payment method must be less than 50 characters').optional().nullable(),
  reference: z.string().max(100, 'Reference must be less than 100 characters').optional().nullable(),
  notes: z.string().optional().nullable(),
  created_at: z.string(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }),
});

// Schema for creating a new payment
export const createPaymentSchema = z.object({
  invoice_id: z.string().uuid({ message: 'Please select a valid invoice' }),
  amount: z.number().positive({ message: 'Payment amount must be positive' }),
  payment_date: z.string().date({ message: 'Please enter a valid payment date' }),
  payment_method: z.string().max(50, 'Payment method must be less than 50 characters').optional().or(z.literal('')),
  reference: z.string().max(100, 'Reference must be less than 100 characters').optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  payment_method: data.payment_method === '' ? null : data.payment_method,
  reference: data.reference === '' ? null : data.reference,
  notes: data.notes === '' ? null : data.notes,
}));

// Schema for updating a payment
export const updatePaymentSchema = z.object({
  amount: z.number().positive({ message: 'Payment amount must be positive' }).optional(),
  payment_date: z.string().date({ message: 'Please enter a valid payment date' }).optional(),
  payment_method: z.string().max(50, 'Payment method must be less than 50 characters').optional().or(z.literal('')),
  reference: z.string().max(100, 'Reference must be less than 100 characters').optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  payment_method: data.payment_method === '' ? null : data.payment_method,
  reference: data.reference === '' ? null : data.reference,
  notes: data.notes === '' ? null : data.notes,
}));

// Schema for payment filtering and search
export const paymentFilterSchema = z.object({
  invoice_id: z.string().uuid({ message: 'Invalid invoice ID' }).optional(),
  date_from: z.string().date({ message: 'Invalid start date' }).optional(),
  date_to: z.string().date({ message: 'Invalid end date' }).optional(),
  payment_method: z.string().optional(),
  amount_min: z.number().nonnegative().optional(),
  amount_max: z.number().nonnegative().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Schema for payment methods (predefined list)
export const paymentMethodSchema = z.enum([
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
  'stripe',
  'other',
]);

// Type exports
export type Payment = z.infer<typeof paymentSchema>;
export type CreatePaymentData = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentData = z.infer<typeof updatePaymentSchema>;
export type PaymentFilter = z.infer<typeof paymentFilterSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;