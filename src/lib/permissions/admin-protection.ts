/**
 * Admin-Only Operation Protection
 * 
 * This module provides utilities to protect admin-only operations and ensure
 * that sensitive workspace management functions are only accessible to admins.
 */

import { Role, Permission, hasPermission, ADMIN_ONLY_OPERATIONS } from './index';
import { ServerActionContext, EnhancedServerActionResult } from '@/lib/server-actions';

/**
 * Admin-only operations that require special protection
 */
export const PROTECTED_ADMIN_OPERATIONS = {
  // Workspace management
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_UPDATE: 'workspace:update',
  MEMBER_MANAGEMENT: 'workspace:manage_members',
  MEMBER_INVITE: 'workspace:invite_members',
  MEMBER_REMOVE: 'workspace:remove_members',
  ROLE_CHANGE: 'workspace:change_member_roles',
  
  // System administration
  SYSTEM_ADMIN: 'system:admin',
  AUDIT_ACCESS: 'audit:read',
  
  // Destructive operations
  CUSTOMER_DELETE: 'customers:delete',
  INVOICE_DELETE: 'invoices:delete',
  EXPENSE_DELETE: 'expenses:delete',
  TASK_DELETE: 'tasks:delete',
  PAYMENT_DELETE: 'payments:delete',
} as const;

/**
 * Check if an operation is admin-only
 */
export function isAdminOnlyOperation(operation: string): boolean {
  return Object.values(PROTECTED_ADMIN_OPERATIONS).includes(operation as any) ||
         ADMIN_ONLY_OPERATIONS.includes(operation as any);
}

/**
 * Validate admin access for protected operations
 */
export function validateAdminAccess(role: Role, operation: string): {
  allowed: boolean;
  error?: string;
} {
  if (!isAdminOnlyOperation(operation)) {
    // Not an admin-only operation, check normal permissions
    return { allowed: hasPermission(role, operation as Permission) };
  }

  if (role !== 'admin') {
    return {
      allowed: false,
      error: `Operation '${operation}' requires admin privileges. Current role: ${role}`,
    };
  }

  return { allowed: true };
}

/**
 * Admin protection middleware for server actions
 */
export function requireAdminForOperation<TInput, TOutput>(
  operation: string,
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return async (input: TInput, context: ServerActionContext): Promise<EnhancedServerActionResult<TOutput>> => {
    if (!context.workspace) {
      return {
        success: false,
        message: 'Workspace context required for admin operations',
        errors: [{
          field: 'workspace',
          message: 'Admin operations require workspace context',
          code: 'workspace_required'
        }]
      };
    }

    const validation = validateAdminAccess(context.workspace.role, operation);
    
    if (!validation.allowed) {
      return {
        success: false,
        message: validation.error || 'Admin access required',
        errors: [{
          field: 'permissions',
          message: validation.error || 'This operation requires admin privileges',
          code: 'admin_required'
        }]
      };
    }

    return action(input, context);
  };
}

/**
 * Workspace management protection
 */
export function requireWorkspaceAdmin<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return requireAdminForOperation(PROTECTED_ADMIN_OPERATIONS.MEMBER_MANAGEMENT, action);
}

/**
 * Member management protection
 */
export function requireMemberManagementAccess<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return requireAdminForOperation(PROTECTED_ADMIN_OPERATIONS.MEMBER_MANAGEMENT, action);
}

/**
 * Role change protection
 */
export function requireRoleChangeAccess<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return requireAdminForOperation(PROTECTED_ADMIN_OPERATIONS.ROLE_CHANGE, action);
}

/**
 * Member removal protection
 */
export function requireMemberRemovalAccess<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return requireAdminForOperation(PROTECTED_ADMIN_OPERATIONS.MEMBER_REMOVE, action);
}

/**
 * Destructive operation protection
 */
export function requireDestructiveOperationAccess<TInput, TOutput>(
  resourceType: 'customer' | 'invoice' | 'expense' | 'task' | 'payment',
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  const operation = `${resourceType}s:delete` as keyof typeof PROTECTED_ADMIN_OPERATIONS;
  return requireAdminForOperation(PROTECTED_ADMIN_OPERATIONS[operation] || `${resourceType}s:delete`, action);
}

/**
 * System administration protection
 */
export function requireSystemAdmin<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return requireAdminForOperation(PROTECTED_ADMIN_OPERATIONS.SYSTEM_ADMIN, action);
}

/**
 * Audit access protection
 */
export function requireAuditAccess<TInput, TOutput>(
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>
) {
  return requireAdminForOperation(PROTECTED_ADMIN_OPERATIONS.AUDIT_ACCESS, action);
}

/**
 * Check if user can perform workspace management operations
 */
export function canManageWorkspace(role: Role): boolean {
  return role === 'admin';
}

/**
 * Check if user can invite members
 */
export function canInviteMembers(role: Role): boolean {
  return hasPermission(role, 'workspace:invite_members');
}

/**
 * Check if user can remove members
 */
export function canRemoveMembers(role: Role): boolean {
  return hasPermission(role, 'workspace:remove_members');
}

/**
 * Check if user can change member roles
 */
export function canChangeMemberRoles(role: Role): boolean {
  return hasPermission(role, 'workspace:change_member_roles');
}

/**
 * Check if user can delete resources
 */
export function canDeleteResource(role: Role, resourceType: 'customer' | 'invoice' | 'expense' | 'task' | 'payment'): boolean {
  const permission = `${resourceType}s:delete` as Permission;
  return hasPermission(role, permission);
}

/**
 * Check if user can access audit logs
 */
export function canAccessAuditLogs(role: Role): boolean {
  return hasPermission(role, 'audit:read');
}

/**
 * Check if user has system admin privileges
 */
export function hasSystemAdminPrivileges(role: Role): boolean {
  return hasPermission(role, 'system:admin');
}

/**
 * Validate multiple admin operations
 */
export function validateMultipleAdminOperations(
  role: Role,
  operations: string[]
): {
  allowed: boolean;
  deniedOperations: string[];
  errors: string[];
} {
  const deniedOperations: string[] = [];
  const errors: string[] = [];

  for (const operation of operations) {
    const validation = validateAdminAccess(role, operation);
    if (!validation.allowed) {
      deniedOperations.push(operation);
      if (validation.error) {
        errors.push(validation.error);
      }
    }
  }

  return {
    allowed: deniedOperations.length === 0,
    deniedOperations,
    errors,
  };
}

/**
 * Create admin operation audit log entry
 */
export function createAdminOperationAuditLog(
  context: ServerActionContext,
  operation: string,
  resourceType?: string,
  resourceId?: string,
  additionalData?: Record<string, any>
) {
  return {
    timestamp: new Date().toISOString(),
    userId: context.user.id,
    userEmail: context.user.email,
    workspaceId: context.workspace?.id,
    workspaceSlug: context.workspace?.slug,
    operation,
    resourceType,
    resourceId,
    userRole: context.workspace?.role,
    additionalData,
    severity: 'HIGH', // Admin operations are high severity
    category: 'ADMIN_OPERATION',
  };
}

/**
 * Log admin operation for audit trail
 */
export async function logAdminOperation(
  context: ServerActionContext,
  operation: string,
  resourceType?: string,
  resourceId?: string,
  additionalData?: Record<string, any>
) {
  const auditLog = createAdminOperationAuditLog(
    context,
    operation,
    resourceType,
    resourceId,
    additionalData
  );

  // In a real implementation, you would store this in an audit_logs table
  console.log('Admin Operation Audit Log:', auditLog);

  // You could also send to external logging service
  // await sendToAuditService(auditLog);
}

/**
 * Wrapper to automatically log admin operations
 */
export function withAdminOperationLogging<TInput, TOutput>(
  operation: string,
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>,
  resourceType?: string
) {
  return async (input: TInput, context: ServerActionContext): Promise<EnhancedServerActionResult<TOutput>> => {
    // Log the operation attempt
    await logAdminOperation(context, operation, resourceType, undefined, { input });

    try {
      const result = await action(input, context);

      // Log the operation result
      await logAdminOperation(
        context,
        `${operation}_RESULT`,
        resourceType,
        result.success ? extractResourceId(result.data) : undefined,
        { success: result.success, message: result.message }
      );

      return result;
    } catch (error) {
      // Log the operation error
      await logAdminOperation(
        context,
        `${operation}_ERROR`,
        resourceType,
        undefined,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      throw error;
    }
  };
}

/**
 * Extract resource ID from result data
 */
function extractResourceId(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data.id) return data.id;
  return undefined;
}