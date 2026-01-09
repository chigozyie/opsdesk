import { z } from 'zod';
import { createAdminAction, createSuccessResponse, createErrorResponse } from './index';
import { auditLogger } from '@/lib/services/audit-logger';

// Schema for fetching audit logs
const getAuditLogsSchema = z.object({
  workspaceSlug: z.string().min(1),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

// Schema for getting audit statistics
const getAuditStatsSchema = z.object({
  workspaceSlug: z.string().min(1),
  days: z.number().min(1).max(365).default(30),
});

/**
 * Get audit logs for a workspace (admin only)
 */
export const getAuditLogs = createAdminAction(
  getAuditLogsSchema,
  async (input, context) => {
    try {
      const offset = (input.page - 1) * input.limit;

      const result = await auditLogger.getAuditLogs(context.workspace!.id, {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        userId: input.userId,
        action: input.action,
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
        offset,
      });

      if (result.error) {
        return createErrorResponse('Failed to fetch audit logs');
      }

      return createSuccessResponse({
        logs: result.data,
        pagination: {
          page: input.page,
          limit: input.limit,
          hasMore: result.data.length === input.limit,
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return createErrorResponse('Failed to fetch audit logs');
    }
  },
  {
    enableAuditLogging: true,
    auditAction: 'VIEW_AUDIT_LOGS',
    auditResourceType: 'audit_logs',
  }
);

/**
 * Get audit statistics for a workspace (admin only)
 */
export const getAuditStats = createAdminAction(
  getAuditStatsSchema,
  async (input, context) => {
    try {
      const result = await auditLogger.getAuditStats(context.workspace!.id, input.days);

      if (result.error) {
        return createErrorResponse('Failed to fetch audit statistics');
      }

      return createSuccessResponse(result.data);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return createErrorResponse('Failed to fetch audit statistics');
    }
  },
  {
    enableAuditLogging: true,
    auditAction: 'VIEW_AUDIT_STATS',
    auditResourceType: 'audit_logs',
  }
);