import { z } from 'zod';

// Common pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
});

// Common sorting schema
export const sortingSchema = z.object({
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Common search schema
export const searchSchema = z.object({
  search: z.string().min(1).optional(),
  search_fields: z.array(z.string()).optional(),
});

// Common date range schema
export const dateRangeSchema = z.object({
  date_from: z.string().date({ message: 'Please enter a valid start date' }).optional(),
  date_to: z.string().date({ message: 'Please enter a valid end date' }).optional(),
}).refine((data) => {
  if (data.date_from && data.date_to) {
    return new Date(data.date_from) <= new Date(data.date_to);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['date_to'],
});

// Common ID parameter schema
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Please provide a valid ID' }),
});

// Common workspace context schema
export const workspaceContextSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Please provide a valid workspace ID' }),
});

// Common audit fields schema (for database records)
export const auditFieldsSchema = z.object({
  created_at: z.string(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }),
  updated_at: z.string(),
});

// Common soft delete schema
export const softDeleteSchema = z.object({
  archived: z.boolean().default(false),
  archived_at: z.string().optional().nullable(),
  archived_by: z.string().uuid({ message: 'Invalid archiver ID' }).optional().nullable(),
});

// Common bulk operation schema
export const bulkOperationSchema = z.object({
  ids: z.array(z.string().uuid({ message: 'Invalid ID format' })).min(1, 'At least one item must be selected'),
  operation: z.enum(['delete', 'archive', 'restore']),
});

// Common file upload schema
export const fileUploadSchema = z.object({
  file_name: z.string().min(1, 'File name is required'),
  file_size: z.number().positive('File size must be positive'),
  file_type: z.string().min(1, 'File type is required'),
  file_url: z.string().url('Please provide a valid file URL'),
});

// Common notification schema
export const notificationSchema = z.object({
  type: z.enum(['success', 'error', 'warning', 'info']),
  title: z.string().min(1, 'Notification title is required'),
  message: z.string().min(1, 'Notification message is required'),
  duration: z.number().positive().optional(),
});

// Common API response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })).optional(),
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    has_more: z.boolean().optional(),
  }).optional(),
});

// Type exports
export type Pagination = z.infer<typeof paginationSchema>;
export type Sorting = z.infer<typeof sortingSchema>;
export type Search = z.infer<typeof searchSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type WorkspaceContext = z.infer<typeof workspaceContextSchema>;
export type AuditFields = z.infer<typeof auditFieldsSchema>;
export type SoftDelete = z.infer<typeof softDeleteSchema>;
export type BulkOperation = z.infer<typeof bulkOperationSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;