'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { completeTask, deleteTask } from '@/lib/server-actions/task-actions';
import type { Task } from '@/lib/validation/schemas/task';

interface TaskListProps {
  tasks: Task[];
  workspaceSlug: string;
  userRole: 'admin' | 'member' | 'viewer';
  currentPage: number;
  totalTasks: number;
  hasMore: boolean;
  members: Array<{
    user_id: string;
    role: string;
    users: {
      id: string;
      email: string;
    } | null;
  }>;
}

export function TaskList({ 
  tasks, 
  workspaceSlug, 
  userRole, 
  currentPage, 
  totalTasks, 
  hasMore,
  members
}: TaskListProps) {
  const router = useRouter();
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [deletingTasks, setDeletingTasks] = useState<Set<string>>(new Set());

  const canModify = userRole === 'admin' || userRole === 'member';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAssigneeName = (assignedTo: string | null | undefined) => {
    if (!assignedTo) return 'Unassigned';
    const member = members.find(m => m.user_id === assignedTo);
    return member?.users?.email || 'Unknown User';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (completingTasks.has(task.id) || task.status === 'completed') return;

    const confirmed = confirm(`Are you sure you want to mark "${task.title}" as completed?`);
    if (!confirmed) return;

    setCompletingTasks(prev => new Set(prev).add(task.id));

    try {
      const result = await completeTask({
        id: task.id,
        workspace_id: task.workspace_id,
      });

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('An error occurred while completing the task');
    } finally {
      setCompletingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (deletingTasks.has(task.id)) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingTasks(prev => new Set(prev).add(task.id));

    try {
      const result = await deleteTask({
        id: task.id,
        workspace_id: task.workspace_id,
      });

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('An error occurred while deleting the task');
    } finally {
      setDeletingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first task.
        </p>
        {canModify && (
          <div className="mt-6">
            <Link
              href={`/app/${workspaceSlug}/tasks/new` as any}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Task
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Task Table */}
      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              {canModify && (
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                        {task.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getAssigneeName(task.assigned_to)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {task.due_date ? (
                    <span className={
                      new Date(task.due_date) < new Date() && task.status !== 'completed'
                        ? 'text-red-600 font-medium'
                        : ''
                    }>
                      {formatDate(task.due_date)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(task.created_at)}
                </td>
                {canModify && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/app/${workspaceSlug}/tasks/${task.id}/edit` as any}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      {task.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteTask(task)}
                          disabled={completingTasks.has(task.id)}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {completingTasks.has(task.id) ? 'Completing...' : 'Complete'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        disabled={deletingTasks.has(task.id)}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingTasks.has(task.id) ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalTasks > 20 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            {currentPage > 1 && (
              <Link
                href={`/app/${workspaceSlug}/tasks?page=${currentPage - 1}` as any}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {hasMore && (
              <Link
                href={`/app/${workspaceSlug}/tasks?page=${currentPage + 1}` as any}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * 20 + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 20, totalTasks)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{totalTasks}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {currentPage > 1 && (
                  <Link
                    href={`/app/${workspaceSlug}/tasks?page=${currentPage - 1}` as any}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {hasMore && (
                  <Link
                    href={`/app/${workspaceSlug}/tasks?page=${currentPage + 1}` as any}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}