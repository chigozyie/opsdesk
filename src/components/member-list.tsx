'use client';

import { useState, useTransition } from 'react';
import { updateMemberRole, removeMember } from '@/lib/workspace/actions';
import { RoleManagement } from './role-management';
import { PermissionGate, AdminOnly, WorkspaceManagement } from './permission-gate';
import { Role } from '@/lib/permissions';

interface Member {
  id: string;
  userId: string;
  email: string;
  role: Role;
  joinedAt: string;
  isCurrentUser: boolean;
}

interface MemberListProps {
  members: Member[];
  workspaceId: string;
  currentUserRole: Role;
  onMemberUpdate?: () => void;
}

export function MemberList({ members, workspaceId, currentUserRole, onMemberUpdate }: MemberListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'joined'>('joined');
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');

  const handleMemberUpdate = () => {
    setError(null);
    setSuccess(null);
    onMemberUpdate?.();
  };

  const getRoleBadgeColor = (role: string) => {
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

  const getRoleIcon = (role: string) => {
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

  // Filter and sort members
  const filteredAndSortedMembers = members
    .filter(member => filterRole === 'all' || member.role === filterRole)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.email.localeCompare(b.email);
        case 'role':
          const roleOrder = { admin: 3, member: 2, viewer: 1 };
          return (roleOrder[b.role] || 0) - (roleOrder[a.role] || 0);
        case 'joined':
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        default:
          return 0;
      }
    });

  const memberCounts = {
    total: members.length,
    admin: members.filter(m => m.role === 'admin').length,
    member: members.filter(m => m.role === 'member').length,
    viewer: members.filter(m => m.role === 'viewer').length,
  };

  return (
    <div className="space-y-4">
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

      {/* Member Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Member Overview</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{memberCounts.total}</div>
            <div className="text-xs text-gray-500">Total Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{memberCounts.admin}</div>
            <div className="text-xs text-gray-500">👑 Admins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{memberCounts.member}</div>
            <div className="text-xs text-gray-500">👤 Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{memberCounts.viewer}</div>
            <div className="text-xs text-gray-500">👁️ Viewers</div>
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="sort" className="block text-xs font-medium text-gray-700">
              Sort by
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'role' | 'joined')}
              className="mt-1 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="joined">Join Date</option>
              <option value="name">Name</option>
              <option value="role">Role</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter" className="block text-xs font-medium text-gray-700">
              Filter by role
            </label>
            <select
              id="filter"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as Role | 'all')}
              className="mt-1 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">👑 Admin</option>
              <option value="member">👤 Member</option>
              <option value="viewer">👁️ Viewer</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Showing {filteredAndSortedMembers.length} of {members.length} members
        </div>
      </div>

      {/* Member List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredAndSortedMembers.map((member) => (
            <li key={member.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.email}
                      </p>
                      {member.isCurrentUser && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}>
                        <span className="mr-1">{getRoleIcon(member.role)}</span>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <RoleManagement
                    memberId={member.id}
                    currentRole={member.role}
                    memberEmail={member.email}
                    workspaceId={workspaceId}
                    currentUserRole={currentUserRole}
                    isCurrentUser={member.isCurrentUser}
                    onUpdate={handleMemberUpdate}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {filteredAndSortedMembers.length === 0 && (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500 mt-2">
            {filterRole === 'all' ? 'No members found.' : `No ${filterRole}s found.`}
          </p>
          {filterRole !== 'all' && (
            <button
              onClick={() => setFilterRole('all')}
              className="text-blue-600 hover:text-blue-800 text-sm underline mt-1"
              type="button"
            >
              Show all members
            </button>
          )}
        </div>
      )}

      {/* Permission-based help text */}
      <PermissionGate
        userRole={currentUserRole}
        requiredPermissions={['workspace:manage_members']}
        fallback={
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-blue-800 text-sm">
                  You have read-only access to the member list. Contact a workspace admin to manage member roles or invite new members.
                </p>
              </div>
            </div>
          </div>
        }
      >
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-800 text-sm">
                You have admin access to manage member roles, invite new members, and remove members from this workspace.
              </p>
            </div>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}