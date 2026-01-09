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
  createTaskSchema, 
  updateTaskSchema, 
  completeTaskSchema,
  taskFilterSchema,
  taskAssignmentSchema,
  bulkTaskOperationSchema,
  type Task
} from '@/lib/validation/schemas/task';
import { buildAdvancedFilters, type AdvancedFilterOptions } from '@/lib/utils/search-optimization';
} from '@/lib/validation/schemas/task';

// Input schema for task creation with workspace context
const createTaskInputSchema = createTaskSchema.extend({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for task update with IDs
const updateTaskInputSchema = updateTaskSchema.extend({
  id: z.string().uuid({ message: 'Invalid task ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for task completion
const completeTaskInputSchema = completeTaskSchema.extend({
  id: z.string().uuid({ message: 'Invalid task ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for task deletion
const deleteTaskInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid task ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

/**
 * Creates a new task
 */
export const createTask = createWorkspaceAction(
  createTaskInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Task>> => {
    try {
      const { workspace_id, ...taskData } = input;

      // Validate assignee belongs to workspace if provided
      if (taskData.assigned_to) {
        const { data: assignee } = await context.supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspace_id)
          .eq('user_id', taskData.assigned_to)
          .single();

        if (!assignee) {
          return createErrorResponse('Assigned user is not a member of this workspace');
        }
      }

      // Validate due date is not in the past if provided
      if (taskData.due_date) {
        const dueDate = new Date(taskData.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        if (dueDate < today) {
          return createErrorResponse('Due date cannot be in the past');
        }
      }

      // Create task with audit fields
      const taskCreateData = addAuditFields(
        {
          workspace_id,
          ...taskData,
          status: 'pending',
        },
        context.user.id
      );

      const { data: task, error } = await context.supabase
        .from('tasks')
        .insert(taskCreateData)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'create task');
      }

      return createSuccessResponse(task as Task, 'Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      return createErrorResponse('Failed to create task');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'create',
    auditResourceType: 'task',
  }
);

/**
 * Updates an existing task
 */
export const updateTask = createWorkspaceAction(
  updateTaskInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Task>> => {
    try {
      const { id, workspace_id, ...updateData } = input;

      // Check if task exists and belongs to workspace
      const { data: existingTask } = await context.supabase
        .from('tasks')
        .select('id, status, assigned_to')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingTask) {
        return createErrorResponse('Task not found');
      }

      // Validate assignee belongs to workspace if being updated
      if (updateData.assigned_to) {
        const { data: assignee } = await context.supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspace_id)
          .eq('user_id', updateData.assigned_to)
          .single();

        if (!assignee) {
          return createErrorResponse('Assigned user is not a member of this workspace');
        }
      }

      // Validate due date is not in the past if being updated
      if (updateData.due_date) {
        const dueDate = new Date(updateData.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        if (dueDate < today) {
          return createErrorResponse('Due date cannot be in the past');
        }
      }

      // Handle status changes
      const finalUpdateData = { ...updateData };
      if (updateData.status === 'completed' && existingTask.status !== 'completed') {
        finalUpdateData.completed_at = new Date().toISOString();
      } else if (updateData.status !== 'completed' && existingTask.status === 'completed') {
        finalUpdateData.completed_at = null;
      }

      // Update task with audit fields
      const taskUpdateData = addAuditFields(finalUpdateData, context.user.id, true);

      const { data: task, error } = await context.supabase
        .from('tasks')
        .update(taskUpdateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'update task');
      }

      return createSuccessResponse(task as Task, 'Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      return createErrorResponse('Failed to update task');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'update',
    auditResourceType: 'task',
  }
);

/**
 * Completes a task
 */
export const completeTask = createWorkspaceAction(
  completeTaskInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Task>> => {
    try {
      const { id, workspace_id, completed_at } = input;

      // Check if task exists and belongs to workspace
      const { data: existingTask } = await context.supabase
        .from('tasks')
        .select('id, status')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingTask) {
        return createErrorResponse('Task not found');
      }

      if (existingTask.status === 'completed') {
        return createErrorResponse('Task is already completed');
      }

      // Complete task with audit fields
      const taskUpdateData = addAuditFields(
        {
          status: 'completed',
          completed_at: completed_at || new Date().toISOString(),
        },
        context.user.id,
        true
      );

      const { data: task, error } = await context.supabase
        .from('tasks')
        .update(taskUpdateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'complete task');
      }

      return createSuccessResponse(task as Task, 'Task completed successfully');
    } catch (error) {
      console.error('Error completing task:', error);
      return createErrorResponse('Failed to complete task');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'complete',
    auditResourceType: 'task',
  }
);

/**
 * Assigns a task to a user
 */
export const assignTask = createWorkspaceAction(
  taskAssignmentSchema.extend({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Task>> => {
    try {
      const { task_id, assigned_to, workspace_id } = input;

      // Check if task exists and belongs to workspace
      const { data: existingTask } = await context.supabase
        .from('tasks')
        .select('id')
        .eq('id', task_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingTask) {
        return createErrorResponse('Task not found');
      }

      // Validate assignee belongs to workspace
      const { data: assignee } = await context.supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspace_id)
        .eq('user_id', assigned_to)
        .single();

      if (!assignee) {
        return createErrorResponse('Assigned user is not a member of this workspace');
      }

      // Update task assignment
      const taskUpdateData = addAuditFields({ assigned_to }, context.user.id, true);

      const { data: task, error } = await context.supabase
        .from('tasks')
        .update(taskUpdateData)
        .eq('id', task_id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'assign task');
      }

      return createSuccessResponse(task as Task, 'Task assigned successfully');
    } catch (error) {
      console.error('Error assigning task:', error);
      return createErrorResponse('Failed to assign task');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'assign',
    auditResourceType: 'task',
  }
);

/**
 * Performs bulk operations on tasks
 */
export const bulkTaskOperation = createWorkspaceAction(
  bulkTaskOperationSchema.extend({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    success_count: number;
    failed_count: number;
    errors: string[];
  }>> => {
    try {
      const { task_ids, operation, assigned_to, workspace_id } = input;

      // Verify all tasks exist and belong to workspace
      const { data: existingTasks } = await context.supabase
        .from('tasks')
        .select('id, status')
        .eq('workspace_id', workspace_id)
        .in('id', task_ids);

      if (!existingTasks || existingTasks.length !== task_ids.length) {
        return createErrorResponse('One or more tasks not found');
      }

      // Validate assignee if operation is assign
      if (operation === 'assign' && assigned_to) {
        const { data: assignee } = await context.supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspace_id)
          .eq('user_id', assigned_to)
          .single();

        if (!assignee) {
          return createErrorResponse('Assigned user is not a member of this workspace');
        }
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Perform operation on each task
      for (const taskId of task_ids) {
        try {
          let updateData: any = {};

          switch (operation) {
            case 'complete':
              updateData = {
                status: 'completed',
                completed_at: new Date().toISOString(),
              };
              break;
            case 'assign':
              updateData = { assigned_to };
              break;
            case 'delete':
              const { error: deleteError } = await context.supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)
                .eq('workspace_id', workspace_id);

              if (deleteError) {
                errors.push(`Failed to delete task ${taskId}: ${deleteError.message}`);
                failedCount++;
              } else {
                successCount++;
              }
              continue;
          }

          if (Object.keys(updateData).length > 0) {
            const taskUpdateData = addAuditFields(updateData, context.user.id, true);

            const { error: updateError } = await context.supabase
              .from('tasks')
              .update(taskUpdateData)
              .eq('id', taskId)
              .eq('workspace_id', workspace_id);

            if (updateError) {
              errors.push(`Failed to ${operation} task ${taskId}: ${updateError.message}`);
              failedCount++;
            } else {
              successCount++;
            }
          }
        } catch (error: any) {
          errors.push(`Failed to ${operation} task ${taskId}: ${error.message}`);
          failedCount++;
        }
      }

      const message = `Bulk operation completed: ${successCount} successful, ${failedCount} failed`;
      return createSuccessResponse({
        success_count: successCount,
        failed_count: failedCount,
        errors,
      }, message);
    } catch (error) {
      console.error('Error performing bulk task operation:', error);
      return createErrorResponse('Failed to perform bulk operation');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'bulk_operation',
    auditResourceType: 'task',
  }
);

/**
 * Gets tasks for a workspace with filtering and pagination
 */
export const getTasks = createWorkspaceAction(
  taskFilterSchema.extend({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>> => {
    try {
      const { 
        workspace_id, 
        search, 
        status, 
        assigned_to, 
        due_date_from, 
        due_date_to, 
        created_by, 
        page, 
        limit 
      } = input;

      // Use the optimized paginated query builder
      const { createPaginatedQuery } = await import('@/lib/utils/database-pagination');
      
      const result = await createPaginatedQuery<Task>(context.supabase, 'tasks')
        .select('*')
        .workspace(workspace_id)
        .search(search || '', ['title', 'description'])
        .filter('status', status)
        .filter('assigned_to', assigned_to)
        .filter('created_by', created_by)
        .dateRange('due_date', due_date_from, due_date_to)
        .orderBy('created_at', 'desc')
        .paginate({ page, limit });

      return createSuccessResponse(result);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return createErrorResponse('Failed to fetch tasks');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets a single task by ID
 */
export const getTask = createWorkspaceAction(
  z.object({
    id: z.string().uuid({ message: 'Invalid task ID' }),
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Task>> => {
    try {
      const { id, workspace_id } = input;

      const { data: task, error } = await context.supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (error || !task) {
        return createErrorResponse('Task not found');
      }

      return createSuccessResponse(task as Task);
    } catch (error) {
      console.error('Error fetching task:', error);
      return createErrorResponse('Failed to fetch task');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Deletes a task
 */
export const deleteTask = createWorkspaceAction(
  deleteTaskInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<void>> => {
    try {
      const { id, workspace_id } = input;

      // Check if task exists and belongs to workspace
      const { data: existingTask } = await context.supabase
        .from('tasks')
        .select('id')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingTask) {
        return createErrorResponse('Task not found');
      }

      // Delete task
      const { error } = await context.supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspace_id);

      if (error) {
        return handleDatabaseError(error, 'delete task');
      }

      return createSuccessResponse(undefined, 'Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      return createErrorResponse('Failed to delete task');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'delete',
    auditResourceType: 'task',
  }
);
/**
 * Enhanced task search with advanced filtering and relevance scoring
 */
export const searchTasksAdvanced = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
    search: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    assigned_to: z.string().uuid().optional(),
    created_by: z.string().uuid().optional(),
    due_date_from: z.string().optional(),
    due_date_to: z.string().optional(),
    created_from: z.string().optional(),
    created_to: z.string().optional(),
    sort_by: z.enum(['title', 'status', 'due_date', 'created_at', 'updated_at']).default('created_at'),
    sort_direction: z.enum(['asc', 'desc']).default('desc'),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    fuzzy_search: z.boolean().default(false),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    searchAnalytics?: {
      executionTime: number;
      resultCount: number;
    };
  }>> => {
    try {
      const startTime = Date.now();
      const { 
        workspace_id, 
        search, 
        status,
        assigned_to,
        created_by,
        due_date_from,
        due_date_to,
        created_from,
        created_to,
        sort_by,
        sort_direction,
        page, 
        limit,
        fuzzy_search
      } = input;

      // Build advanced filter options
      const filterOptions: AdvancedFilterOptions = {
        search: search ? {
          query: search,
          fields: ['title', 'description'],
          fuzzyMatch: fuzzy_search,
        } : undefined,
        filters: {
          status: status,
          assigned_to: assigned_to,
          created_by: created_by,
        },
        dateRanges: {
          due_date: {
            from: due_date_from,
            to: due_date_to,
          },
          created_at: {
            from: created_from,
            to: created_to,
          },
        },
        sortBy: sort_by,
        sortDirection: sort_direction,
      };

      // Start with base query including assignee data
      let query = context.supabase
        .from('tasks')
        .select(`
          *,
          assignee:assigned_to(
            id,
            email
          ),
          creator:created_by(
            id,
            email
          )
        `, { count: 'exact' })
        .eq('workspace_id', workspace_id);

      // Apply advanced filters
      query = buildAdvancedFilters(query, filterOptions);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: tasks, error, count } = await query;

      if (error) {
        throw error;
      }

      const executionTime = Date.now() - startTime;
      const total = count || 0;
      const hasMore = offset + limit < total;

      return createSuccessResponse({
        tasks: tasks as Task[],
        total,
        page,
        limit,
        hasMore,
        searchAnalytics: {
          executionTime,
          resultCount: tasks?.length || 0,
        },
      });
    } catch (error) {
      console.error('Error in advanced task search:', error);
      return createErrorResponse('Failed to search tasks');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Get task search suggestions for autocomplete
 */
export const getTaskSuggestions = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
    query: z.string().min(1, 'Query is required'),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    suggestions: Array<{
      id: string;
      title: string;
      status: string;
      assignee_email?: string;
      type: 'task';
    }>;
  }>> => {
    try {
      const { workspace_id, query, limit } = input;

      const { data: tasks, error } = await context.supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          assignee:assigned_to(email)
        `)
        .eq('workspace_id', workspace_id)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const suggestions = (tasks || []).map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        assignee_email: task.assignee?.email,
        type: 'task' as const,
      }));

      return createSuccessResponse({ suggestions });
    } catch (error) {
      console.error('Error getting task suggestions:', error);
      return createErrorResponse('Failed to get task suggestions');
    }
  },
  {
    requiredRole: 'viewer',
  }
);