import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { validateData, type ValidationResult, type ServerActionResult } from '@/lib/validation/utils';
import { auditLogger, type AuditLogEntry } from '@/lib/services/audit-logger';
import { securityService } from '@/lib/services/security-service';
import { headers } from 'next/headers';

/**
 * Enhanced server action result with audit trail support
 */
export interface EnhancedServerActionResult<T = any> extends ServerActionResult<T> {
  auditTrail?: {
    action: string;
    resourceType: string;
    resourceId?: string;
    workspaceId: string;
    userId: string;
    timestamp: string;
    changes?: Record<string, any>;
  };
}

/**
 * Server action context containing user and workspace information
 */
export interface ServerActionContext {
  user: {
    id: string;
    email: string;
  };
  workspace?: {
    id: string;
    slug: string;
    role: 'admin' | 'member' | 'viewer';
  };
  supabase: ReturnType<typeof createClient>;
}

/**
 * Configuration for server action wrapper
 */
export interface ServerActionConfig {
  requireWorkspace?: boolean;
  requiredRole?: 'admin' | 'member' | 'viewer';
  auditAction?: string;
  auditResourceType?: string;
  enableAuditLogging?: boolean;
  enableRateLimit?: boolean;
  rateLimitAttempts?: number;
  rateLimitWindowMinutes?: number;
  enableSecurityChecks?: boolean;
  sanitizeInput?: boolean;
}

/**
 * Creates a validated server action with authentication, authorization, and audit trail
 */
export function createServerAction<TInput, TOutput>(
  inputSchema: z.ZodSchema<TInput>,
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>,
  config: ServerActionConfig = {}
) {
  return async (input: unknown): Promise<EnhancedServerActionResult<TOutput>> => {
    try {
      // Step 1: Validate input
      const validation = validateData(inputSchema, input);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
          message: 'Validation failed',
        };
      }

      // Step 2: Security checks
      if (config.enableSecurityChecks !== false) {
        // Sanitize input if enabled
        if (config.sanitizeInput !== false) {
          validation.data = securityService.sanitizeInput(validation.data);
        }

        // Validate SQL parameters
        if (!securityService.validateSqlParams(validation.data || {})) {
          await securityService.logSecurityEvent(
            'SQL_INJECTION_ATTEMPT',
            'unknown',
            { input: validation.data }
          );
          return {
            success: false,
            message: 'Invalid input parameters',
            errors: [
              {
                field: 'security',
                message: 'Invalid input parameters detected',
                code: 'security_violation',
              },
            ],
          };
        }
      }

      // Step 3: Authenticate user
      let user;
      try {
        user = await requireAuth();
      } catch (error) {
        return {
          success: false,
          message: 'Authentication required',
          errors: [
            {
              field: 'auth',
              message: 'You must be logged in to perform this action',
              code: 'auth_required',
            },
          ],
        };
      }

      // Step 4: Rate limiting check
      if (config.enableRateLimit && config.auditAction) {
        const rateLimit = await securityService.checkRateLimit(
          user.id,
          config.auditAction,
          config.rateLimitWindowMinutes || 5,
          config.rateLimitAttempts || 10
        );

        if (!rateLimit.allowed) {
          return {
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
            errors: [
              {
                field: 'rate_limit',
                message: `Too many attempts. Try again after ${rateLimit.resetTime.toLocaleTimeString()}`,
                code: 'rate_limit_exceeded',
              },
            ],
          };
        }
      }

      // Step 5: Initialize context
      const supabase = createClient();
      const context: ServerActionContext = {
        user: user as { id: string; email: string },
        supabase,
      };

      // Step 6: Handle workspace requirements
      if (config.requireWorkspace) {
        const workspaceData = await getWorkspaceFromInput(validation.data, supabase, user.id);
        if (!workspaceData.success) {
          return {
            success: false,
            message: (workspaceData as any).message || 'Workspace access denied',
            errors: (workspaceData as any).errors,
          };
        }
        context.workspace = workspaceData.data!;

        // Step 7: Check role permissions
        if (config.requiredRole && !hasRequiredRole(context.workspace.role, config.requiredRole)) {
          return {
            success: false,
            message: 'Insufficient permissions',
            errors: [
              {
                field: 'permissions',
                message: `This action requires ${config.requiredRole} role or higher`,
                code: 'insufficient_permissions',
              },
            ],
          };
        }

        // Step 8: Security monitoring for workspace actions
        if (config.enableSecurityChecks !== false && context.workspace) {
          const headersList = headers();
          const ipAddress = headersList.get('x-forwarded-for') || 
                           headersList.get('x-real-ip') || 
                           'unknown';
          const userAgent = headersList.get('user-agent') || 'unknown';

          const suspiciousActivity = await securityService.detectSuspiciousActivity(
            user.id,
            context.workspace.id,
            config.auditAction || 'ACTION',
            {
              ipAddress,
              userAgent,
              resourceType: config.auditResourceType,
            }
          );

          if (suspiciousActivity.suspicious) {
            console.warn('Suspicious activity detected:', suspiciousActivity.reasons);
            // Continue with the action but log the suspicious activity
          }
        }
      }

      // Step 9: Execute the action
      const result = await action(validation.data!, context);

      // Step 10: Add comprehensive audit trail if configured
      if (config.enableAuditLogging && context.workspace) {
        try {
          // Get request metadata
          const headersList = headers();
          const ipAddress = headersList.get('x-forwarded-for') || 
                           headersList.get('x-real-ip') || 
                           'unknown';
          const userAgent = headersList.get('user-agent') || 'unknown';

          // Determine audit action and resource type
          const auditAction = config.auditAction || 'ACTION';
          const auditResourceType = config.auditResourceType || 'UNKNOWN';
          const resourceId = extractResourceId(result.data);

          // Log the audit trail
          await auditLogger.logAction(
            context.workspace.id,
            user.id,
            auditAction,
            auditResourceType,
            resourceId,
            {
              input: sanitizeForAudit(validation.data),
              result: result.success ? 'SUCCESS' : 'FAILURE',
              message: result.message,
            },
            {
              ipAddress,
              userAgent,
            }
          );

          // Add audit trail to response
          const auditTrail = {
            action: auditAction,
            resourceType: auditResourceType,
            resourceId,
            workspaceId: context.workspace.id,
            userId: user.id,
            timestamp: new Date().toISOString(),
            changes: sanitizeForAudit(validation.data),
          };

          result.auditTrail = auditTrail;
        } catch (auditError) {
          console.error('Audit logging failed:', auditError);
          // Don't fail the main operation due to audit logging issues
        }
      }

      return result;
    } catch (error) {
      console.error('Server action error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
        errors: [
          {
            field: 'server',
            message: 'Server error occurred while processing your request',
            code: 'server_error',
          },
        ],
      };
    }
  };
}

/**
 * Creates a form data server action wrapper
 */
export function createFormAction<TOutput>(
  inputSchema: z.ZodSchema<any>,
  action: (input: any, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>,
  config: ServerActionConfig = {}
) {
  const serverAction = createServerAction(inputSchema, action, config);
  
  return async (formData: FormData): Promise<EnhancedServerActionResult<TOutput>> => {
    // Convert FormData to plain object
    const data: Record<string, any> = {};
    const entries = Array.from(formData.entries());
    
    for (const [key, value] of entries) {
      if (key.includes('[')) {
        // Handle array fields like line_items[0][description]
        const matches = key.match(/^([^[]+)\[(\d+)\]\[([^\]]+)\]$/);
        if (matches && matches.length >= 4) {
          const arrayName = matches[1];
          const index = matches[2];
          const fieldName = matches[3];
          if (arrayName && index && fieldName) {
            if (!data[arrayName]) data[arrayName] = [];
            const indexNum = parseInt(index);
            if (!data[arrayName][indexNum]) data[arrayName][indexNum] = {};
            data[arrayName][indexNum][fieldName] = value;
          }
        } else {
          // Handle simple array fields like categories[]
          const arrayMatch = key.match(/^([^[]+)\[\]$/);
          if (arrayMatch && arrayMatch.length >= 2) {
            const arrayName = arrayMatch[1];
            if (arrayName) {
              if (!data[arrayName]) data[arrayName] = [];
              data[arrayName].push(value);
            }
          }
        }
      } else {
        // Handle regular fields
        data[key] = value;
      }
    }

    // Convert string numbers to actual numbers for numeric fields
    const convertedData = convertStringNumbers(data);
    
    return serverAction(convertedData);
  };
}

/**
 * Extracts workspace information from input data
 */
async function getWorkspaceFromInput(
  input: any,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<ValidationResult<{ id: string; slug: string; role: 'admin' | 'member' | 'viewer' }>> {
  let workspaceId: string | undefined;
  let workspaceSlug: string | undefined;

  // Try to extract workspace identifier from input
  if (input.workspace_id) {
    workspaceId = input.workspace_id;
  } else if (input.workspaceSlug) {
    workspaceSlug = input.workspaceSlug;
  } else if (input.workspace_slug) {
    workspaceSlug = input.workspace_slug;
  }

  if (!workspaceId && !workspaceSlug) {
    return {
      success: false,
      errors: [
        {
          field: 'workspace',
          message: 'Workspace identifier is required',
          code: 'workspace_required',
        },
      ],
    };
  }

  try {
    let query = supabase
      .from('workspaces')
      .select(`
        id,
        slug,
        workspace_members!inner (
          role
        )
      `)
      .eq('workspace_members.user_id', userId);

    if (workspaceId) {
      query = query.eq('id', workspaceId);
    } else if (workspaceSlug) {
      query = query.eq('slug', workspaceSlug);
    }

    const { data: workspace, error } = await query.single();

    if (error || !workspace) {
      return {
        success: false,
        errors: [
          {
            field: 'workspace',
            message: 'Workspace not found or access denied',
            code: 'workspace_not_found',
          },
        ],
      };
    }

    const workspaceData = workspace as any;
    return {
      success: true,
      data: {
        id: workspaceData.id,
        slug: workspaceData.slug,
        role: workspaceData.workspace_members[0]?.role as 'admin' | 'member' | 'viewer',
      },
    };
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return {
      success: false,
      errors: [
        {
          field: 'workspace',
          message: 'Failed to validate workspace access',
          code: 'workspace_error',
        },
      ],
    };
  }
}

/**
 * Checks if user has required role
 */
function hasRequiredRole(userRole: 'admin' | 'member' | 'viewer', requiredRole: 'admin' | 'member' | 'viewer'): boolean {
  const roleHierarchy = { admin: 3, member: 2, viewer: 1 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Extracts resource ID from action result
 */
function extractResourceId(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data === 'object' && data.id) return data.id;
  if (typeof data === 'string') return data;
  return undefined;
}

/**
 * Extracts changes from input data for audit trail
 */
function extractChanges(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  
  // Remove sensitive fields from audit trail
  const sensitiveFields = ['password', 'token', 'secret'];
  const changes: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!sensitiveFields.includes(key.toLowerCase())) {
      changes[key] = value;
    }
  }
  
  return changes;
}

/**
 * Sanitizes data for audit logging by removing sensitive information
 */
function sanitizeForAudit(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'private_key'];
  const sanitized: any = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForAudit(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Converts string representations of numbers to actual numbers
 */
function convertStringNumbers(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Try to convert to number if it looks like a number
    const num = Number(obj);
    if (!isNaN(num) && obj.trim() !== '') {
      return num;
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertStringNumbers);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertStringNumbers(value);
    }
    return converted;
  }
  
  return obj;
}

/**
 * Creates a workspace-scoped server action
 */
export function createWorkspaceAction<TInput, TOutput>(
  inputSchema: z.ZodSchema<TInput>,
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>,
  config: Omit<ServerActionConfig, 'requireWorkspace'> = {}
) {
  return createServerAction(inputSchema, action, {
    ...config,
    requireWorkspace: true,
  });
}

/**
 * Creates an admin-only server action
 */
export function createAdminAction<TInput, TOutput>(
  inputSchema: z.ZodSchema<TInput>,
  action: (input: TInput, context: ServerActionContext) => Promise<EnhancedServerActionResult<TOutput>>,
  config: Omit<ServerActionConfig, 'requireWorkspace' | 'requiredRole'> = {}
) {
  return createServerAction(inputSchema, action, {
    ...config,
    requireWorkspace: true,
    requiredRole: 'admin',
  });
}

/**
 * Utility function to create success response
 */
export function createSuccessResponse<T>(data: T, message?: string): EnhancedServerActionResult<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Utility function to create error response
 */
export function createErrorResponse(message: string, errors?: Array<{ field: string; message: string; code: string }>): EnhancedServerActionResult {
  return {
    success: false,
    message,
    errors: errors || [
      {
        field: 'general',
        message,
        code: 'error',
      },
    ],
  };
}

/**
 * Utility function to handle database errors
 */
export function handleDatabaseError(error: any, operation: string): EnhancedServerActionResult {
  console.error(`Database error during ${operation}:`, error);
  
  // Handle specific PostgreSQL errors
  if (error.code === '23505') {
    return createErrorResponse('A record with this information already exists');
  }
  
  if (error.code === '23503') {
    return createErrorResponse('Referenced record not found');
  }
  
  if (error.code === '23514') {
    return createErrorResponse('Data validation failed');
  }
  
  return createErrorResponse(`Failed to ${operation}. Please try again.`);
}

/**
 * Utility function to add audit fields to data
 */
export function addAuditFields(data: any, userId: string, isUpdate = false): any {
  const now = new Date().toISOString();
  
  if (isUpdate) {
    return {
      ...data,
      updated_at: now,
    };
  }
  
  return {
    ...data,
    created_at: now,
    created_by: userId,
    updated_at: now,
  };
}

// Re-export payment actions
export * from './payment-actions';

// Re-export dashboard actions
export * from './dashboard-actions';