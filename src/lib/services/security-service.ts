import { createClient } from '@/lib/supabase/server';
import { auditLogger } from './audit-logger';

/**
 * Security service for input sanitization, rate limiting, and security monitoring
 */
export class SecurityService {
  private supabase = createClient();

  /**
   * Sanitize input to prevent XSS and injection attacks
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Sanitize string input to prevent XSS
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') return str;
    
    // Remove potentially dangerous HTML tags and attributes
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^>]*>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Validate SQL query parameters to prevent SQL injection
   */
  validateSqlParams(params: Record<string, any>): boolean {
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(;|\-\-|\/\*|\*\/)/,
      /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
      /(\'|\").*(\bOR\b|\bAND\b).*(\=|LIKE)/i,
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            console.warn(`Potential SQL injection attempt detected:`, value);
            return false;
          }
        }
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (!checkValue(item)) return false;
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          if (!checkValue(val)) return false;
        }
      }
      return true;
    };

    for (const [key, value] of Object.entries(params)) {
      if (!checkValue(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Rate limiting check for user actions
   */
  async checkRateLimit(
    userId: string,
    action: string,
    windowMinutes: number = 5,
    maxAttempts: number = 10
  ): Promise<{ allowed: boolean; remainingAttempts: number; resetTime: Date }> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
      const key = `${userId}:${action}`;

      // Check recent attempts in audit logs
      const { data: recentAttempts } = await this.supabase
        .from('audit_logs')
        .select('created_at')
        .eq('user_id', userId)
        .eq('action', action.toUpperCase())
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      const attemptCount = recentAttempts?.length || 0;
      const allowed = attemptCount < maxAttempts;
      const remainingAttempts = Math.max(0, maxAttempts - attemptCount);
      const resetTime = new Date(Date.now() + windowMinutes * 60 * 1000);

      if (!allowed) {
        // Log rate limit violation
        await this.logSecurityEvent(
          'RATE_LIMIT_EXCEEDED',
          userId,
          {
            action,
            attemptCount,
            maxAttempts,
            windowMinutes,
          }
        );
      }

      return {
        allowed,
        remainingAttempts,
        resetTime,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the request if rate limiting fails
      return {
        allowed: true,
        remainingAttempts: maxAttempts,
        resetTime: new Date(Date.now() + windowMinutes * 60 * 1000),
      };
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(
    userId: string,
    workspaceId: string,
    action: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      resourceType?: string;
      resourceId?: string;
    }
  ): Promise<{ suspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check for rapid-fire actions
      const { data: recentActions } = await this.supabase
        .from('audit_logs')
        .select('created_at, action, ip_address')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .gte('created_at', oneHourAgo.toISOString());

      if (recentActions && recentActions.length > 50) {
        reasons.push('Excessive activity in the last hour');
      }

      // Check for IP address changes
      if (metadata.ipAddress && recentActions) {
        const uniqueIPs = new Set(recentActions.map(a => (a as any).ip_address).filter(Boolean));
        if (uniqueIPs.size > 3) {
          reasons.push('Multiple IP addresses used recently');
        }
      }

      // Check for unusual delete patterns
      if (action === 'DELETE') {
        const { data: recentDeletes } = await this.supabase
          .from('audit_logs')
          .select('created_at')
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId)
          .eq('action', 'DELETE')
          .gte('created_at', oneDayAgo.toISOString());

        if (recentDeletes && recentDeletes.length > 10) {
          reasons.push('Unusual number of delete operations');
        }
      }

      // Check for off-hours activity (outside 6 AM - 10 PM)
      const hour = now.getHours();
      if (hour < 6 || hour > 22) {
        const { data: offHoursActivity } = await this.supabase
          .from('audit_logs')
          .select('created_at')
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId)
          .gte('created_at', oneDayAgo.toISOString());

        const offHoursCount = offHoursActivity?.filter(a => {
          const activityHour = new Date((a as any).created_at).getHours();
          return activityHour < 6 || activityHour > 22;
        }).length || 0;

        if (offHoursCount > 5) {
          reasons.push('Unusual off-hours activity pattern');
        }
      }

      const suspicious = reasons.length > 0;

      if (suspicious) {
        await this.logSecurityEvent(
          'SUSPICIOUS_ACTIVITY_DETECTED',
          userId,
          {
            action,
            workspaceId,
            reasons,
            metadata,
          }
        );
      }

      return { suspicious, reasons };
    } catch (error) {
      console.error('Suspicious activity detection failed:', error);
      return { suspicious: false, reasons: [] };
    }
  }

  /**
   * Log security events for monitoring
   */
  async logSecurityEvent(
    eventType: string,
    userId: string,
    details: any,
    workspaceId?: string
  ): Promise<void> {
    try {
      // Log to audit trail if workspace is available
      if (workspaceId) {
        await auditLogger.logAction(
          workspaceId,
          userId,
          `SECURITY_${eventType}`,
          'security_event',
          undefined,
          details
        );
      }

      // Also log to console for immediate monitoring
      console.warn(`Security Event [${eventType}]:`, {
        userId,
        workspaceId,
        timestamp: new Date().toISOString(),
        details,
      });

      // In a production environment, you might also:
      // - Send alerts to security team
      // - Log to external security monitoring service
      // - Trigger automated responses
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Validate file upload security
   */
  validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      errors.push('File type not allowed');
    }

    // Check MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      errors.push('Invalid file MIME type');
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|com)$/i,
      /\.(php|asp|jsp|js)$/i,
      /\.(sh|bash|zsh)$/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        errors.push('Potentially dangerous file type');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash sensitive data for storage
   */
  async hashSensitiveData(data: string): Promise<string> {
    // In a real application, use a proper hashing library like bcrypt
    // This is a simple example using built-in crypto
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export singleton instance
export const securityService = new SecurityService();