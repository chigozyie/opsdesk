'use client';

import { useState, useTransition } from 'react';
import { updateMemberRole, removeMember } from '@/lib/workspace/actions';

interface Member {
  id: string;
  userId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
  isCurrentUser: boolean;
}

interface MemberListProps {
  members: Member[];
  workspaceId: string;
  currentUserRole: 'admin' | 'member' | 'viewer';
  onMemberUpdate?: () => void;
}

export function MemberList({ members, workspaceId, currentUserRole, onMemberUpdate }: MemberListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRoleUpdate = async (memberId: string, newRole: string) => {
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('memberId', memberId);
    formData.append('role', newRole);
    formData.append('workspaceId', workspaceId);

    startTransition(async () => {
      const result = await updateMemberRole(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Role updated successfully');
        onMemberUpdate?.();
      }
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) {
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('memberId', memberId);
    formData.append('workspaceId', workspaceId);

    startTransition(async () => {
      const result = await removeMember(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || 'Member removed successfully');
        onMemberUpdate?.();
      }
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {members.map((member) => (
            <li key={member.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {member.email}
                      </p>
                      {member.isCurrentUser && (
                        <span className="text-xs text-gray-500">(You)</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {currentUserRole === 'admin' && !member.isCurrentUser ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleUpdate(member.id, e.target.value)}
                      disabled={isPending}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Change role for ${member.email}`}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  )}

                  {currentUserRole === 'admin' && !member.isCurrentUser && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isPending}
                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {members.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No members found.</p>
        </div>
      )}
    </div>
  );
}