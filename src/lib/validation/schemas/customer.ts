import { z } from 'zod';

// Base customer schema for database operations
export const customerSchema = z.object({
  id: z.string().uuid({ message: 'Invalid customer ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  name: z.string().min(1, 'Customer name is required').max(255, 'Customer name must be less than 255 characters'),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional().nullable(),
  phone: z.string().max(50, 'Phone number must be less than 50 characters').optional().nullable(),
  address: z.string().optional().nullable(),
  archived: z.boolean().default(false),
  created_at: z.string(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }),
  updated_at: z.string(),
});

// Schema for creating a new customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255, 'Customer name must be less than 255 characters'),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone number must be less than 50 characters').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  email: data.email === '' ? null : data.email,
  phone: data.phone === '' ? null : data.phone,
  address: data.address === '' ? null : data.address,
}));

// Schema for updating a customer
export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255, 'Customer name must be less than 255 characters').optional(),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone number must be less than 50 characters').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  archived: z.boolean().optional(),
}).transform((data) => ({
  ...data,
  email: data.email === '' ? null : data.email,
  phone: data.phone === '' ? null : data.phone,
  address: data.address === '' ? null : data.address,
}));

// Schema for customer filtering and search
export const customerFilterSchema = z.object({
  search: z.string().optional(),
  archived: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Type exports
export type Customer = z.infer<typeof customerSchema>;
export type CreateCustomerData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>;
export type CustomerFilter = z.infer<typeof customerFilterSchema>;