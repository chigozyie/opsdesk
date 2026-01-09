'use client';

import { useState, useTransition } from 'react';
import { updateMemberRole, removeMember } from '@/lib/workspace/actions';
import { Role, Permission, hasPermission, getRolePermissions } from '@/lib/permissions';
import { PermissionGate, AdminOnly } from './permission-gate';

interface RoleManagementProps {
  memberId: string;
  currentRole: Role;
  memberEmail: string;
  workspaceId: string;
  currentUserRole: Role;
  isCurrentUser: boolean;
  onUpdate?: () => void;
}

interface RoleChangeHistory {
  id: string;
  previousRole: Role;
  newRole: Role;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export function RoleManagement({
  memberId,
  currentRole,
  memberEmail,
  workspaceId,
  currentUserRole,
  isCurrentUser,
  onUpdate
}: RoleManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [showPermissions, setShowPermissions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<Role | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManageRoles = hasPermission(currentUserRole, 'workspace:change_member_roles');
  const canRemoveMembers = hasPermission(currentUserRole, 'workspace:remove_members');
  const canViewAuditLog = hasPermission(currentUserRole, 'audit:read');

  const handleRoleChangeRequest = (newRole: Role) => {
    if (newRole === currentRole) return;
    setSelectedNewRole(newRole);
    setShowRoleChangeModal(true);
  };

  const handleRoleChange = async () => {
    if (!selectedNewRole) return;

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('memberId', memberId);
    formData.append('role', selectedNewRole);
    formData.append('workspaceId', workspaceId);
    formData.append('previousRole', currentRole);
    formData.append('reason', changeReason);
    formData.append('memberEmail', memberEmail);

    startTransition(async () => {
      const result = await updateMemberRole(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(`Role updated from ${currentRole} to ${selectedNewRole}`);
        onUpdate?.();
        setShowRoleChangeModal(false);
        setSelectedNewRole(null);
        setChangeReason('');
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      }
    });
  };

  const handleRemoveMember = async () => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the workspace? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('memberId', memberId);
    formData.append('workspaceId', workspaceId);
    formData.append('memberEmail', memberEmail);
    formData.append('reason', 'Member removed by admin');

    startTransition(async () => {
      const result = await removeMember(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess('Member removed successfully');
        onUpdate?.();
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

  const getRoleBadgeColor = (role: Role): string => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'member':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const rolePermissions = getRolePermissions(currentRole);

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="text-red-800 text-xs">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="text-green-800 text-xs">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PermissionGate
            userRole={currentUserRole}
            requiredPermissions={['workspace:change_member_roles']}
            fallback={
              <div className="flex flex-col space-y-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(currentRole)}`}>
                  <span className="mr-1">{getRoleIcon(currentRole)}</span>
                  {currentRole}
                </span>
                <p className="text-xs text-gray-500">{getRoleDescription(currentRole)}</p>
              </div>
            }
          >
            {!isCurrentUser ? (
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(currentRole)}`}>
                    <span className="mr-1">{getRoleIcon(currentRole)}</span>
                    {currentRole}
                  </span>
                  <button
                    onClick={() => setShowRoleChangeModal(true)}
                    disabled={isPending}
                    className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                    type="button"
                  >
                    Change Role
                  </button>
                </div>
                <p className="text-xs text-gray-500">{getRoleDescription(currentRole)}</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(currentRole)}`}>
                  <span className="mr-1">{getRoleIcon(currentRole)}</span>
                  {currentRole} (You)
                </span>
                <p className="text-xs text-gray-500">{getRoleDescription(currentRole)}</p>
              </div>
            )}
          </PermissionGate>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPermissions(!showPermissions)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
            type="button"
          >
            {showPermissions ? 'Hide' : 'Show'} Permissions
          </button>

          <PermissionGate
            userRole={currentUserRole}
            requiredPermissions={['audit:read']}
          >
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-gray-600 hover:text-gray-800 underline"
              type="button"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </PermissionGate>

          <PermissionGate
            userRole={currentUserRole}
            requiredPermissions={['workspace:remove_members']}
          >
            {!isCurrentUser && (
              <button
                onClick={handleRemoveMember}
                disabled={isPending}
                className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                type="button"
              >
                Remove
              </button>
            )}
          </PermissionGate>
        </div>
      </div>

      {showPermissions && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
          <h4 className="text-xs font-medium text-gray-900 mb-2">
            Permissions for {currentRole} role:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {rolePermissions.map((permission) => (
              <div key={permission} className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-700">{formatPermission(permission)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
          <h4 className="text-xs font-medium text-gray-900 mb-2">
            Role Change History:
          </h4>
          <p className="text-xs text-gray-600">
            Role change history would be displayed here. (Audit logging system not fully implemented in this demo)
          </p>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleChangeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Change Role for {memberEmail}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role
                </label>
                <select
                  value={selectedNewRole || currentRole}
                  onChange={(e) => setSelectedNewRole(e.target.value as Role)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Select new role for member"
                >
                  <option value="viewer">👁️ Viewer - Read-only access</option>
                  <option value="member">👤 Member - Can create and edit data</option>
                  <option value="admin">👑 Admin - Full access</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Change (Optional)
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g., Promoted to team lead, Role adjustment for project needs..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleChangeModal(false);
                    setSelectedNewRole(null);
                    setChangeReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleChange}
                  disabled={isPending || !selectedNewRole || selectedNewRole === currentRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  type="button"
                >
                  {isPending ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPermission(permission: Permission): string {
  // Convert permission strings to human-readable format
  const [resource, action] = permission.split(':');
  const resourceName = resource?.replace('_', ' ') || '';
  const actionName = action?.replace('_', ' ') || '';
  
  return `${actionName} ${resourceName}`.replace(/\b\w/g, l => l.toUpperCase());
}