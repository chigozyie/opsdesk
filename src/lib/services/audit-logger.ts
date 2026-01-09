import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/types/database';

type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

export interface AuditLogEntry {
  workspaceId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private supabase = createClient();

  /**
   * Log an audit trail entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const auditLog: AuditLogInsert = {
        workspace_id: entry.workspaceId,
        user_id: entry.userId || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        old_values: entry.oldValues || null,
        new_values: entry.newValues || null,
        changes: entry.changes || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
      };

      const { error } = await (this.supabase
        .from('audit_logs') as any)
        .insert(auditLog);

      if (error) {
        console.error('Failed to log audit trail:', error);
        // Don't throw error to avoid breaking the main operation
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log a create operation
   */
  async logCreate(
    workspaceId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    newValues: any,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      workspaceId,
      userId,
      action: 'CREATE',
      resourceType,
      resourceId,
      newValues,
      changes: newValues,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  /**
   * Log an update operation
   */
  async logUpdate(
    workspaceId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    oldValues: any,
    newValues: any,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Calculate changes
    const changes: Record<string, { old: any; new: any }> = {};
    
    if (oldValues && newValues) {
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          changes[key] = {
            old: oldValues[key],
            new: newValues[key],
          };
        }
      }
    }

    await this.log({
      workspaceId,
      userId,
      action: 'UPDATE',
      resourceType,
      resourceId,
      oldValues,
      newValues,
      changes,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  /**
   * Log a delete operation
   */
  async logDelete(
    workspaceId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    oldValues: any,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      workspaceId,
      userId,
      action: 'DELETE',
      resourceType,
      resourceId,
      oldValues,
      changes: oldValues,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  /**
   * Log a custom action
   */
  async logAction(
    workspaceId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      workspaceId,
      userId,
      action: action.toUpperCase(),
      resourceType,
      resourceId,
      changes: details,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  /**
   * Get audit logs for a workspace (admin only)
   */
  async getAuditLogs(
    workspaceId: string,
    options?: {
      resourceType?: string;
      resourceId?: string;
      userId?: string;
      action?: string;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id (
            email
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (options?.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      if (options?.resourceId) {
        query = query.eq('resource_id', options.resourceId);
      }

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch audit logs:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Audit logs fetch error:', error);
      return { data: [], error };
    }
  }

  /**
   * Get audit log statistics for a workspace
   */
  async getAuditStats(workspaceId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('action, resource_type, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Failed to fetch audit stats:', error);
        return { data: null, error };
      }

      // Process statistics
      const stats = {
        totalActions: data?.length || 0,
        actionsByType: {} as Record<string, number>,
        actionsByResource: {} as Record<string, number>,
        dailyActivity: {} as Record<string, number>,
      };

      data?.forEach((log) => {
        // Count by action type
        stats.actionsByType[(log as any).action] = (stats.actionsByType[(log as any).action] || 0) + 1;
        
        // Count by resource type
        stats.actionsByResource[(log as any).resource_type] = (stats.actionsByResource[(log as any).resource_type] || 0) + 1;
        
        // Count by day
        const day = new Date((log as any).created_at).toISOString().split('T')[0];
        if (day) {
          stats.dailyActivity[day] = (stats.dailyActivity[day] || 0) + 1;
        }
      });

      return { data: stats, error: null };
    } catch (error) {
      console.error('Audit stats fetch error:', error);
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();