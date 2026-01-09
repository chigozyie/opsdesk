/**
 * Role-Based Access Control (RBAC) Permission System
 * 
 * This module provides comprehensive permission checking utilities for the BizDesk application.
 * It defines permissions for different roles and provides utilities to check access rights.
 */

export type Role = 'admin' | 'member' | 'viewer';

export type Permission = 
  // Workspace management
  | 'workspace:read'
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:manage_members'
  | 'workspace:invite_members'
  | 'workspace:remove_members'
  | 'workspace:change_member_roles'
  
  // Customer management
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'customers:archive'
  
  // Invoice management
  | 'invoices:read'
  | 'invoices:create'
  | 'invoices:update'
  | 'invoices:delete'
  | 'invoices:send'
  | 'invoices:void'
  
  // Expense management
  | 'expenses:read'
  | 'expenses:create'
  | 'expenses:update'
  | 'expenses:delete'
  
  // Task management
  | 'tasks:read'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:delete'
  | 'tasks:assign'
  | 'tasks:complete'
  
  // Payment management
  | 'payments:read'
  | 'payments:create'
  | 'payments:update'
  | 'payments:delete'
  
  // Financial reporting
  | 'reports:read'
  | 'reports:export'
  
  // Audit and system
  | 'audit:read'
  | 'system:admin';

/**
 * Role-based permission matrix
 * Defines what permissions each role has
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // Workspace management (admin only)
    'workspace:read',
    'workspace:update',
    'workspace:delete',
    'workspace:manage_members',
    'workspace:invite_members',
    'workspace:remove_members',
    'workspace:change_member_roles',
    
    // Full business data access
    'customers:read',
    'customers:create',
    'customers:update',
    'customers:delete',
    'customers:archive',
    
    'invoices:read',
    'invoices:create',
    'invoices:update',
    'invoices:delete',
    'invoices:send',
    'invoices:void',
    
    'expenses:read',
    'expenses:create',
    'expenses:update',
    'expenses:delete',
    
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'tasks:complete',
    
    'payments:read',
    'payments:create',
    'payments:update',
    'payments:delete',
    
    'reports:read',
    'reports:export',
    
    'audit:read',
    'system:admin',
  ],
  
  member: [
    // Limited workspace access
    'workspace:read',
    
    // Full business data access (no delete)
    'customers:read',
    'customers:create',
    'customers:update',
    'customers:archive',
    
    'invoices:read',
    'invoices:create',
    'invoices:update',
    'invoices:send',
    'invoices:void',
    
    'expenses:read',
    'expenses:create',
    'expenses:update',
    
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:assign',
    'tasks:complete',
    
    'payments:read',
    'payments:create',
    'payments:update',
    
    'reports:read',
  ],
  
  viewer: [
    // Read-only access
    'workspace:read',
    'customers:read',
    'invoices:read',
    'expenses:read',
    'tasks:read',
    'payments:read',
    'reports:read',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Check if a role is higher or equal in hierarchy
 */
export function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: Role[]): Role {
  const roleHierarchy: Record<Role, number> = {
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roles.reduce((highest, current) => 
    roleHierarchy[current] > roleHierarchy[highest] ? current : highest
  );
}

/**
 * Check if a role can perform an action on a resource
 */
export function canPerformAction(
  role: Role,
  action: 'create' | 'read' | 'update' | 'delete' | 'manage',
  resource: 'workspace' | 'customers' | 'invoices' | 'expenses' | 'tasks' | 'payments' | 'reports'
): boolean {
  const permission = `${resource}:${action}` as Permission;
  return hasPermission(role, permission);
}

/**
 * Admin-only operations that require admin role regardless of permissions
 */
export const ADMIN_ONLY_OPERATIONS = [
  'workspace:update',
  'workspace:delete',
  'workspace:manage_members',
  'workspace:invite_members',
  'workspace:remove_members',
  'workspace:change_member_roles',
  'system:admin',
  'audit:read',
] as const;

/**
 * Check if an operation requires admin role
 */
export function isAdminOnlyOperation(permission: Permission): boolean {
  return ADMIN_ONLY_OPERATIONS.includes(permission as any);
}

/**
 * Validate that a user can perform multiple operations
 */
export function validatePermissions(role: Role, requiredPermissions: Permission[]): {
  allowed: boolean;
  missingPermissions: Permission[];
} {
  const missingPermissions = requiredPermissions.filter(permission => !hasPermission(role, permission));
  
  return {
    allowed: missingPermissions.length === 0,
    missingPermissions,
  };
}

/**
 * Permission error types for consistent error handling
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly requiredPermission: Permission,
    public readonly userRole: Role
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class InsufficientRoleError extends Error {
  constructor(
    message: string,
    public readonly requiredRole: Role,
    public readonly userRole: Role
  ) {
    super(message);
    this.name = 'InsufficientRoleError';
  }
}

/**
 * Utility to throw permission error if user lacks permission
 */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionError(
      `Permission denied. Required: ${permission}, User role: ${role}`,
      permission,
      role
    );
  }
}

/**
 * Utility to throw role error if user lacks required role
 */
export function requireRole(userRole: Role, requiredRole: Role): void {
  if (!hasRequiredRole(userRole, requiredRole)) {
    throw new InsufficientRoleError(
      `Insufficient role. Required: ${requiredRole}, User role: ${userRole}`,
      requiredRole,
      userRole
    );
  }
}