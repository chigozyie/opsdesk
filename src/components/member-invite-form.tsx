'use client';

import { useState, useTransition } from 'react';
import { inviteMember } from '@/lib/workspace/actions';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';

interface MemberInviteFormProps {
  workspaceId: string;
  onSuccess?: () => void;
}

export function MemberInviteForm({ workspaceId, onSuccess }: MemberInviteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800 text-sm">{success}</p>
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
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          disabled={isPending}
          required
        >
          <option value="viewer">Viewer - Can view data only</option>
          <option value="member">Member - Can create and edit data</option>
          <option value="admin">Admin - Full access including member management</option>
        </select>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? 'Sending Invitation...' : 'Send Invitation'}
      </Button>
    </form>
  );
}