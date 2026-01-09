import { z } from 'zod';

// Task status enum
export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

// Base task schema for database operations
export const taskSchema = z.object({
  id: z.string().uuid({ message: 'Invalid task ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  title: z.string().min(1, 'Task title is required').max(255, 'Task title must be less than 255 characters'),
  description: z.string().optional().nullable(),
  assigned_to: z.string().uuid({ message: 'Invalid assignee ID' }).optional().nullable(),
  status: taskStatusSchema.default('pending'),
  due_date: z.string().date({ message: 'Please enter a valid date' }).optional().nullable(),
  completed_at: z.string().optional().nullable(),
  created_at: z.string(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }),
  updated_at: z.string(),
});

// Schema for creating a new task
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255, 'Task title must be less than 255 characters'),
  description: z.string().optional().or(z.literal('')),
  assigned_to: z.string().uuid({ message: 'Please select a valid assignee' }).optional().or(z.literal('')),
  due_date: z.string().date({ message: 'Please enter a valid due date' }).optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  description: data.description === '' ? null : data.description,
  assigned_to: data.assigned_to === '' ? null : data.assigned_to,
  due_date: data.due_date === '' ? null : data.due_date,
}));

// Schema for updating a task
export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255, 'Task title must be less than 255 characters').optional(),
  description: z.string().optional().or(z.literal('')),
  assigned_to: z.string().uuid({ message: 'Please select a valid assignee' }).optional().or(z.literal('')),
  status: taskStatusSchema.optional(),
  due_date: z.string().date({ message: 'Please enter a valid due date' }).optional().or(z.literal('')),
}).transform((data) => ({
  ...data,
  description: data.description === '' ? null : data.description,
  assigned_to: data.assigned_to === '' ? null : data.assigned_to,
  due_date: data.due_date === '' ? null : data.due_date,
}));

// Schema for task completion
export const completeTaskSchema = z.object({
  completed_at: z.string().datetime({ message: 'Please provide a valid completion timestamp' }).optional(),
}).transform((data) => ({
  status: 'completed' as const,
  completed_at: data.completed_at || new Date().toISOString(),
}));

// Schema for task filtering and search
export const taskFilterSchema = z.object({
  search: z.string().optional(),
  status: taskStatusSchema.optional(),
  assigned_to: z.string().uuid({ message: 'Invalid assignee ID' }).optional(),
  due_date_from: z.string().date({ message: 'Invalid start date' }).optional(),
  due_date_to: z.string().date({ message: 'Invalid end date' }).optional(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Schema for task assignment validation
export const taskAssignmentSchema = z.object({
  task_id: z.string().uuid({ message: 'Please provide a valid task ID' }),
  assigned_to: z.string().uuid({ message: 'Please select a valid assignee' }),
});

// Schema for bulk task operations
export const bulkTaskOperationSchema = z.object({
  task_ids: z.array(z.string().uuid({ message: 'Invalid task ID' })).min(1, 'At least one task must be selected'),
  operation: z.enum(['complete', 'delete', 'assign']),
  assigned_to: z.string().uuid({ message: 'Invalid assignee ID' }).optional(), // Required when operation is 'assign'
}).refine((data) => {
  if (data.operation === 'assign') {
    return data.assigned_to !== undefined;
  }
  return true;
}, {
  message: 'Assignee is required when operation is assign',
  path: ['assigned_to'],
});

// Type exports
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskData = z.infer<typeof createTaskSchema>;
export type UpdateTaskData = z.infer<typeof updateTaskSchema>;
export type CompleteTaskData = z.infer<typeof completeTaskSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
export type TaskAssignment = z.infer<typeof taskAssignmentSchema>;
export type BulkTaskOperation = z.infer<typeof bulkTaskOperationSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;