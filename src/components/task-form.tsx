'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTask, updateTask } from '@/lib/server-actions/task-actions';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import type { Task } from '@/lib/validation/schemas/task';

interface TaskFormProps {
  workspaceId: string;
  workspaceSlug: string;
  mode: 'create' | 'edit';
  task?: Task;
  members: Array<{
    user_id: string;
    role: string;
    users: {
      id: string;
      email: string;
    } | null;
  }>;
}

export function TaskForm({ workspaceId, workspaceSlug, mode, task, members }: TaskFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const data = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        assigned_to: formData.get('assigned_to') as string,
        status: formData.get('status') as 'pending' | 'in_progress' | 'completed',
        due_date: formData.get('due_date') as string,
        workspace_id: workspaceId,
      };

      let result;
      if (mode === 'create') {
        result = await createTask(data);
      } else {
        result = await updateTask({
          ...data,
          id: task!.id,
        });
      }

      if (result.success) {
        router.push(`/app/${workspaceSlug}/tasks` as any);
        router.refresh();
      } else {
        // Handle validation errors
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((error) => {
            errorMap[error.field] = error.message;
          });
          setErrors(errorMap);
        } else {
          setErrors({ general: result.message || 'An error occurred' });
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{errors.general}</div>
        </div>
      )}

      {/* Task Title */}
      <div>
        <FormField
          label="Task Title"
          id="title"
          name="title"
          type="text"
          required
          defaultValue={task?.title || ''}
          placeholder="Enter task title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={task?.description || ''}
            placeholder="Enter task description (optional)"
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Assigned To */}
      <div>
        <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">
          Assign To
        </label>
        <div className="mt-1">
          <select
            id="assigned_to"
            name="assigned_to"
            defaultValue={task?.assigned_to || ''}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.users?.email || 'Unknown User'} ({member.role})
              </option>
            ))}
          </select>
        </div>
        {errors.assigned_to && (
          <p className="mt-1 text-sm text-red-600">{errors.assigned_to}</p>
        )}
      </div>

      {/* Status (only show in edit mode) */}
      {mode === 'edit' && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <div className="mt-1">
            <select
              id="status"
              name="status"
              defaultValue={task?.status || 'pending'}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
          )}
        </div>
      )}

      {/* Due Date */}
      <div>
        <FormField
          label="Due Date"
          id="due_date"
          name="due_date"
          type="date"
          defaultValue={task?.due_date || ''}
        />
        {errors.due_date && (
          <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            router.push(`/app/${workspaceSlug}/tasks` as any);
          }}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText={mode === 'create' ? 'Creating...' : 'Updating...'}
          className="w-auto"
        >
          {mode === 'create' ? 'Create Task' : 'Update Task'}
        </Button>
      </div>
    </form>
  );
}