import { headers } from 'next/headers';
import { getWorkspaceBySlug } from './actions';

export interface WorkspaceContext {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  created_by: string;
  role: 'admin' | 'member' | 'viewer';
}

/**
 * Get workspace context from middleware headers (server components only)
 */
export function getWorkspaceFromHeaders(): {
  workspaceId: string | null;
  workspaceSlug: string | null;
  userRole: 'admin' | 'member' | 'viewer' | null;
} {
  const headersList = headers();
  
  return {
    workspaceId: headersList.get('x-workspace-id'),
    workspaceSlug: headersList.get('x-workspace-slug'),
    userRole: headersList.get('x-user-role') as 'admin' | 'member' | 'viewer' | null,
  };
}

/**
 * Get full workspace context (requires database call)
 */
export async function getWorkspaceContext(slug: string): Promise<WorkspaceContext | null> {
  const workspace = await getWorkspaceBySlug(slug);
  return workspace;
}

/**
 * Check if user has required role for workspace operation
 */
export function hasRequiredRole(
  userRole: 'admin' | 'member' | 'viewer',
  requiredRole: 'admin' | 'member' | 'viewer'
): boolean {
  const roleHierarchy = {
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Validate workspace access for server actions
 */
export async function validateWorkspaceAccess(
  workspaceSlug: string,
  requiredRole: 'admin' | 'member' | 'viewer' = 'viewer'
): Promise<WorkspaceContext> {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  
  if (!workspace) {
    throw new Error('Workspace not found or access denied');
  }

  if (!hasRequiredRole(workspace.role, requiredRole)) {
    throw new Error(`Insufficient permissions. Required: ${requiredRole}, Current: ${workspace.role}`);
  }

  return workspace;
}