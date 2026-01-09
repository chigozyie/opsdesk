import { z } from 'zod';

// Base expense schema for database operations
export const expenseSchema = z.object({
  id: z.string().uuid({ message: 'Invalid expense ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  vendor: z.string().min(1, 'Vendor name is required').max(255, 'Vendor name must be less than 255 characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category must be less than 100 characters'),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  expense_date: z.string().date({ message: 'Please enter a valid date' }),
  description: z.string().optional().nullable(),
  receipt_url: z.string().url({ message: 'Please enter a valid URL' }).optional().nullable(),
  created_at: z.string(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }),
  updated_at: z.string(),
});

// Schema for creating a new expense
export const createExpenseSchema = z.object({
  vendor: z.string().min(1, 'Vendor name is required').max(255, 'Vendor name must be less than 255 characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category must be less than 100 characters'),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  expense_date: z.string().date({ message: 'Please enter a valid date' }),
  description: z.string().optional().or(z.literal('')),
  receipt_url: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  description: data.description === '' ? null : data.description,
  receipt_url: data.receipt_url === '' ? null : data.receipt_url,
}));

// Schema for updating an expense
export const updateExpenseSchema = z.object({
  vendor: z.string().min(1, 'Vendor name is required').max(255, 'Vendor name must be less than 255 characters').optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category must be less than 100 characters').optional(),
  amount: z.number().positive({ message: 'Amount must be positive' }).optional(),
  expense_date: z.string().date({ message: 'Please enter a valid date' }).optional(),
  description: z.string().optional().or(z.literal('')),
  receipt_url: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  description: data.description === '' ? null : data.description,
  receipt_url: data.receipt_url === '' ? null : data.receipt_url,
}));

// Schema for expense filtering and search
export const expenseFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  date_from: z.string().date({ message: 'Invalid start date' }).optional(),
  date_to: z.string().date({ message: 'Invalid end date' }).optional(),
  amount_min: z.number().nonnegative().optional(),
  amount_max: z.number().nonnegative().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Schema for expense categories (predefined list)
export const expenseCategorySchema = z.enum([
  'office_supplies',
  'travel',
  'meals',
  'software',
  'marketing',
  'utilities',
  'rent',
  'insurance',
  'professional_services',
  'equipment',
  'other',
]);

// Schema for expense reporting
export const expenseReportSchema = z.object({
  date_from: z.string().date({ message: 'Please enter a valid start date' }),
  date_to: z.string().date({ message: 'Please enter a valid end date' }),
  categories: z.array(expenseCategorySchema).optional(),
  vendors: z.array(z.string()).optional(),
}).refine((data) => new Date(data.date_from) <= new Date(data.date_to), {
  message: 'Start date must be before or equal to end date',
  path: ['date_to'],
});

// Type exports
export type Expense = z.infer<typeof expenseSchema>;
export type CreateExpenseData = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseData = z.infer<typeof updateExpenseSchema>;
export type ExpenseFilter = z.infer<typeof expenseFilterSchema>;
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type ExpenseReport = z.infer<typeof expenseReportSchema>;