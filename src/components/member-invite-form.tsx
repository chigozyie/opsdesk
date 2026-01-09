'use client';

import { useState, useTransition } from 'react';
import { inviteMember } from '@/lib/workspace/actions';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { PermissionGate } from '@/components/permission-gate';
import { Role } from '@/lib/permissions';

interface MemberInviteFormProps {
  workspaceId: string;
  currentUserRole: Role;
  onSuccess?: () => void;
}

export function MemberInviteForm({ workspaceId, currentUserRole, onSuccess }: MemberInviteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('member');

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(null);
    
    // Add workspace ID to form data
    formData.append('workspaceId', workspaceId);
    
    startTransition(async () => {
      const result = await inviteMember(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Member invited successfully');
        onSuccess?.();
        // Reset form
        const form = document.getElementById('invite-form') as HTMLFormElement;
        if (form) {
          form.reset();
          setSelectedRole('member');
        }
      }
    });
  };

  const getRoleDescription = (role: Role): string => {
    switch (role) {
      case 'admin':
        return 'Full access including workspace and member management';
      case 'member':
        return 'Can create and edit business data';
      case 'viewer':
        return 'Read-only access to business data';
      default:
        return '';
    }
  };

  const getRoleIcon = (role: Role): string => {
    switch (role) {
      case 'admin':
        return '👑';
      case 'member':
        return '👤';
      case 'viewer':
        return '👁️';
      default:
        return '❓';
    }
  };

  return (
    <PermissionGate
      userRole={currentUserRole}
      requiredPermissions={['workspace:invite_members']}
      fallback={
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Access Restricted</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You don't have permission to invite new members to this workspace.</p>
                <p className="mt-1">Contact a workspace admin to invite new team members.</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <form id="invite-form" action={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

        <FormField
          label="Email Address"
          id="email"
          name="email"
          type="email"
          placeholder="user@example.com"
          required
          disabled={isPending}
        />

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <div className="space-y-3">
            {(['viewer', 'member', 'admin'] as Role[]).map((role) => (
              <label key={role} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={selectedRole === role}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isPending}
                  required
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getRoleIcon(role)}</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getRoleDescription(role)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> In this demo, email invitations are not actually sent. 
                In a production system, the invited user would receive an email with a link to join the workspace.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Sending Invitation...' : 'Send Invitation'}
        </Button>
      </form>
    </PermissionGate>
  );
}