/**
 * Authorization Middleware for Server Actions
 * 
 * This module provides middleware functions to check permissions and roles
 * before executing server actions. It integrates with the existing server action framework.
 */

import { 
  Permission, 
  Role, 
  hasPermission, 
  hasRequiredRole, 
  requirePermission, 
  requireRole as checkRequiredRole,
  PermissionError,
  InsufficientRoleError,
  ADMIN_ONLY_OPERATIONS
} from './index';
import { ServerActionContext, EnhancedServerActionResult } from '@/lib/server-actions';

/**
 * Authorization configuration for server actions
 */
export interface AuthorizationConfig {
  /** Required permissions for the action */
  requiredPermissions?: Permission[];
  /** Required minimum role for the action */
  requiredRole?: Role;
  /** Whether this is an admin-only operation */
  adminOnly?: boolean;
  /** Custom authorization function */
  customAuth?: (context: ServerActionContext) => Promise<boolean>;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  allowed: boolean;
  error?: {
    message: string;
    code: string;
    field: string;
  };
}

/**
 * Check if user is authorized to perform an action
 */
export async function checkAuthorization(
  context: ServerActionContext,
  config: AuthorizationConfig
): Promise<AuthorizationResult> {
  try {
    // Ensure we have workspace context if permissions are required
    if ((config.requiredPermissions || config.requiredRole || config.adminOnly) && !context.workspace) {
      return {
        allowed: false,
        error: {
          message: 'Workspace context is required for this operation',
          code: 'workspace_required',
          field: 'workspace',
        },
      };
    }

    const userRole = context.workspace?.role;

    // Check admin-only operations
    if (config.adminOnly && userRole !== 'admin') {
      return {
        allowed: false,
        error: {
          message: 'This operation requires admin privileges',
          code: 'admin_required',
          field: 'permissions',
        },
      };
    }

    // Check required role
    if (config.requiredRole && userRole && !hasRequiredRole(userRole, config.requiredRole)) {
      return {
        allowed: false,
        error: {
          message: `This operation requires ${config.requiredRole} role or higher. Current role: ${userRole}`,
          code: 'insufficient_role',
          field: 'permissions',
        },
      };
    }

    // Check required permissions
    if (config.requiredPermissions && userRole) {
      const missingPermissions = config.requiredPermissions.filter(
        permission => !hasPermission(userRole, permission)
      );

      if (missingPermissions.length > 0) {
        return {
          allowed: false,
          error: {
            message: `Missing required permissions: ${missingPermissions.join(', ')}`,
            code: 'missing_permissions',
            field: 'permissions',
          },
        };
      }
    }

    // Check custom authorization
    if (config.customAuth) {
      const customResult = await config.customAuth(context);
      if (!customResult) {
        return {
          allowed: false,
          error: {
            message: 'Custom authorization check failed',
            code: 'custom_auth_failed',
            field: 'permissions',
          },
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Authorization check error:', error);
    return {
      allowed: false,
      error: {
        message: 'Authorization check failed',
        code: 'auth_check_error',
        field: 'permissions',
      },
    };
  }
}

/**
 * Middleware function to wrap server actions with authorization
 */
export function withAuthorization<TInput, TOutput>(
  config: AuthorizationConfig,
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return async (input: TInput, context: ServerActionContext): Promise<EnhancedServerActionResult<TOutput>> => {
    // Check authorization
    const authResult = await checkAuthorization(context, config);
    
    if (!authResult.allowed) {
      return {
        success: false,
        message: authResult.error?.message || 'Access denied',
        errors: authResult.error ? [authResult.error] : [],
      };
    }

    // Execute the action if authorized
    return action(input, context);
  };
}

/**
 * Create an admin-only action wrapper
 */
export function requireAdmin<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return withAuthorization({ adminOnly: true }, action);
}

/**
 * Create a role-based action wrapper
 */
export function requireRole<TInput, TOutput>(
  requiredRole: Role,
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return withAuthorization({ requiredRole }, action);
}

/**
 * Create a permission-based action wrapper
 */
export function requirePermissions<TInput, TOutput>(
  requiredPermissions: Permission[],
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return withAuthorization({ requiredPermissions }, action);
}

/**
 * Create a member-or-higher action wrapper
 */
export function requireMember<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return withAuthorization({ requiredRole: 'member' }, action);
}

/**
 * Utility to check if current user can perform an action on a resource
 */
export function canUserPerformAction(
  userRole: Role,
  action: 'create' | 'read' | 'update' | 'delete',
  resource: 'customers' | 'invoices' | 'expenses' | 'tasks' | 'payments'
): boolean {
  const permission = `${resource}:${action}` as Permission;
  return hasPermission(userRole, permission);
}

/**
 * Utility to get user's effective permissions in a workspace
 */
export function getUserPermissions(role: Role): Permission[] {
  const rolePermissions: Record<Role, Permission[]> = {
    admin: [
      'workspace:read', 'workspace:update', 'workspace:delete', 'workspace:manage_members',
      'workspace:invite_members', 'workspace:remove_members', 'workspace:change_member_roles',
      'customers:read', 'customers:create', 'customers:update', 'customers:delete', 'customers:archive',
      'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete', 'invoices:send', 'invoices:void',
      'expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete',
      'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete', 'tasks:assign', 'tasks:complete',
      'payments:read', 'payments:create', 'payments:update', 'payments:delete',
      'reports:read', 'reports:export', 'audit:read', 'system:admin'
    ],
    member: [
      'workspace:read',
      'customers:read', 'customers:create', 'customers:update', 'customers:archive',
      'invoices:read', 'invoices:create', 'invoices:update', 'invoices:send', 'invoices:void',
      'expenses:read', 'expenses:create', 'expenses:update',
      'tasks:read', 'tasks:create', 'tasks:update', 'tasks:assign', 'tasks:complete',
      'payments:read', 'payments:create', 'payments:update',
      'reports:read'
    ],
    viewer: [
      'workspace:read', 'customers:read', 'invoices:read', 'expenses:read',
      'tasks:read', 'payments:read', 'reports:read'
    ]
  };

  return rolePermissions[role] || [];
}

/**
 * Check if user can access a specific workspace resource
 */
export async function checkResourceAccess(
  context: ServerActionContext,
  resourceType: 'customer' | 'invoice' | 'expense' | 'task' | 'payment',
  resourceId: string,
  action: 'read' | 'update' | 'delete' = 'read'
): Promise<boolean> {
  if (!context.workspace) {
    return false;
  }

  // Check if user has permission for this action on this resource type
  const permission = `${resourceType}s:${action}` as Permission;
  if (!hasPermission(context.workspace.role, permission)) {
    return false;
  }

  // Verify the resource belongs to the user's workspace
  try {
    const tableName = resourceType === 'customer' ? 'customers' : 
                     resourceType === 'invoice' ? 'invoices' :
                     resourceType === 'expense' ? 'expenses' :
                     resourceType === 'task' ? 'tasks' : 'payments';

    const { data, error } = await context.supabase
      .from(tableName)
      .select('workspace_id')
      .eq('id', resourceId)
      .single();

    if (error || !data) {
      return false;
    }

    return (data as any).workspace_id === context.workspace.id;
  } catch (error) {
    console.error('Error checking resource access:', error);
    return false;
  }
}

/**
 * Middleware to validate resource ownership
 */
export function requireResourceAccess<TInput extends { id: string }, TOutput>(
  resourceType: 'customer' | 'invoice' | 'expense' | 'task' | 'payment',
  action: 'read' | 'update' | 'delete' = 'read'
) {
  return (
    originalAction: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
  ) => {
    return async (input: TInput, context: ServerActionContext): Promise<EnhancedServerActionResult<TOutput>> => {
      const hasAccess = await checkResourceAccess(context, resourceType, input.id, action);
      
      if (!hasAccess) {
        return {
          success: false,
          message: 'Access denied to this resource',
          errors: [{
            field: 'resource',
            message: `You don't have permission to ${action} this ${resourceType}`,
            code: 'resource_access_denied'
          }]
        };
      }

      return originalAction(input, context);
    };
  };
}

/**
 * Utility to create authorization error response
 */
export function createAuthorizationError(
  message: string,
  code: string = 'authorization_failed'
): EnhancedServerActionResult {
  return {
    success: false,
    message,
    errors: [{
      field: 'permissions',
      message,
      code
    }]
  };
}

/**
 * Check if user can manage workspace members
 */
export function canManageMembers(role: Role): boolean {
  return hasPermission(role, 'workspace:manage_members');
}

/**
 * Check if user can invite members
 */
export function canInviteMembers(role: Role): boolean {
  return hasPermission(role, 'workspace:invite_members');
}

/**
 * Check if user can change member roles
 */
export function canChangeMemberRoles(role: Role): boolean {
  return hasPermission(role, 'workspace:change_member_roles');
}

/**
 * Check if user can remove members
 */
export function canRemoveMembers(role: Role): boolean {
  return hasPermission(role, 'workspace:remove_members');
}