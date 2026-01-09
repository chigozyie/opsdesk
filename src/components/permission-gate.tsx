'use client';

import { ReactNode } from 'react';
import { Role, Permission, hasPermission, hasRequiredRole, hasAnyPermission, hasAllPermissions } from '@/lib/permissions';

interface PermissionGateProps {
  /** Current user's role */
  userRole: Role;
  /** Required permissions (user must have ALL of these) */
  requiredPermissions?: Permission[];
  /** Required permissions (user must have ANY of these) */
  anyPermissions?: Permission[];
  /** Required minimum role */
  requiredRole?: Role;
  /** Whether admin access is required */
  adminOnly?: boolean;
  /** Content to render if user has permission */
  children: ReactNode;
  /** Content to render if user lacks permission */
  fallback?: ReactNode;
  /** Custom permission check function */
  customCheck?: (role: Role) => boolean;
}

/**
 * Component that conditionally renders content based on user permissions
 */
export function PermissionGate({
  userRole,
  requiredPermissions,
  anyPermissions,
  requiredRole,
  adminOnly,
  children,
  fallback = null,
  customCheck
}: PermissionGateProps) {
  let hasAccess = true;

  // Check admin-only requirement
  if (adminOnly && userRole !== 'admin') {
    hasAccess = false;
  }

  // Check required role
  if (requiredRole && !hasRequiredRole(userRole, requiredRole)) {
    hasAccess = false;
  }

  // Check required permissions (must have ALL)
  if (requiredPermissions && !hasAllPermissions(userRole, requiredPermissions)) {
    hasAccess = false;
  }

  // Check any permissions (must have ANY)
  if (anyPermissions && !hasAnyPermission(userRole, anyPermissions)) {
    hasAccess = false;
  }

  // Check custom permission function
  if (customCheck && !customCheck(userRole)) {
    hasAccess = false;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook to check if user has specific permission
 */
export function usePermission(userRole: Role, permission: Permission): boolean {
  return hasPermission(userRole, permission);
}

/**
 * Hook to check if user has required role
 */
export function useRole(userRole: Role, requiredRole: Role): boolean {
  return hasRequiredRole(userRole, requiredRole);
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(userRole: Role): boolean {
  return userRole === 'admin';
}

/**
 * Hook to check if user can perform action on resource
 */
export function useCanPerformAction(
  userRole: Role,
  action: 'create' | 'read' | 'update' | 'delete',
  resource: 'customers' | 'invoices' | 'expenses' | 'tasks' | 'payments'
): boolean {
  const permission = `${resource}:${action}` as Permission;
  return hasPermission(userRole, permission);
}

/**
 * Component for admin-only content
 */
export function AdminOnly({ 
  userRole, 
  children, 
  fallback = null 
}: { 
  userRole: Role; 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <PermissionGate userRole={userRole} adminOnly fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Component for member-or-higher content
 */
export function MemberOrHigher({ 
  userRole, 
  children, 
  fallback = null 
}: { 
  userRole: Role; 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <PermissionGate userRole={userRole} requiredRole="member" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Component for workspace management content
 */
export function WorkspaceManagement({ 
  userRole, 
  children, 
  fallback = null 
}: { 
  userRole: Role; 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <PermissionGate 
      userRole={userRole} 
      requiredPermissions={['workspace:manage_members']} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Component for resource creation content
 */
export function CanCreate({ 
  userRole, 
  resource,
  children, 
  fallback = null 
}: { 
  userRole: Role; 
  resource: 'customers' | 'invoices' | 'expenses' | 'tasks' | 'payments';
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  const permission = `${resource}:create` as Permission;
  return (
    <PermissionGate userRole={userRole} requiredPermissions={[permission]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Component for resource editing content
 */
export function CanEdit({ 
  userRole, 
  resource,
  children, 
  fallback = null 
}: { 
  userRole: Role; 
  resource: 'customers' | 'invoices' | 'expenses' | 'tasks' | 'payments';
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  const permission = `${resource}:update` as Permission;
  return (
    <PermissionGate userRole={userRole} requiredPermissions={[permission]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Component for resource deletion content
 */
export function CanDelete({ 
  userRole, 
  resource,
  children, 
  fallback = null 
}: { 
  userRole: Role; 
  resource: 'customers' | 'invoices' | 'expenses' | 'tasks' | 'payments';
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  const permission = `${resource}:delete` as Permission;
  return (
    <PermissionGate userRole={userRole} requiredPermissions={[permission]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Component that shows different content based on role
 */
export function RoleBasedContent({
  userRole,
  adminContent,
  memberContent,
  viewerContent,
  fallback = null
}: {
  userRole: Role;
  adminContent?: ReactNode;
  memberContent?: ReactNode;
  viewerContent?: ReactNode;
  fallback?: ReactNode;
}) {
  switch (userRole) {
    case 'admin':
      return <>{adminContent || fallback}</>;
    case 'member':
      return <>{memberContent || fallback}</>;
    case 'viewer':
      return <>{viewerContent || fallback}</>;
    default:
      return <>{fallback}</>;
  }
}

/**
 * Component that shows permission denied message
 */
export function PermissionDenied({ 
  message = "You don't have permission to access this feature.",
  requiredRole,
  requiredPermissions
}: {
  message?: string;
  requiredRole?: Role;
  requiredPermissions?: Permission[];
}) {
  return (
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
            <p>{message}</p>
            {requiredRole && (
              <p className="mt-1">Required role: <span className="font-medium">{requiredRole}</span></p>
            )}
            {requiredPermissions && requiredPermissions.length > 0 && (
              <div className="mt-1">
                <p>Required permissions:</p>
                <ul className="list-disc list-inside ml-2">
                  {requiredPermissions.map(permission => (
                    <li key={permission} className="text-xs">{permission}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}