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
      const offset = (page - 1) * limit;

      let query = context.supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspace_id);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }

      if (created_by) {
        query = query.eq('created_by', created_by);
      }

      if (due_date_from) {
        query = query.gte('due_date', due_date_from);
      }

      if (due_date_to) {
        query = query.lte('due_date', due_date_to);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: tasks, error, count } = await query;

      if (error) {
        return handleDatabaseError(error, 'fetch tasks');
      }

      const total = count || 0;
      const hasMore = offset + limit < total;

      return createSuccessResponse({
        tasks: tasks as Task[],
        total,
        page,
        limit,
        hasMore,
      });
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