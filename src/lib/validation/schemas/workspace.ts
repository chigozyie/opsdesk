import { z } from 'zod';

// Workspace member role enum
export const workspaceMemberRoleSchema = z.enum(['admin', 'member', 'viewer']);

// Base workspace schema for database operations
export const workspaceSchema = z.object({
  id: z.string().uuid({ message: 'Invalid workspace ID' }),
  slug: z.string().min(1, 'Workspace slug is required').max(50, 'Workspace slug must be less than 50 characters'),
  name: z.string().min(1, 'Workspace name is required').max(255, 'Workspace name must be less than 255 characters'),
  created_at: z.string(),
  created_by: z.string().uuid({ message: 'Invalid creator ID' }),
  updated_at: z.string(),
});

// Workspace member schema
export const workspaceMemberSchema = z.object({
  id: z.string().uuid({ message: 'Invalid member ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  user_id: z.string().uuid({ message: 'Invalid user ID' }),
  role: workspaceMemberRoleSchema,
  created_at: z.string(),
});

// Schema for creating a new workspace
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(255, 'Workspace name must be less than 255 characters'),
  slug: z.string()
    .min(3, 'Workspace slug must be at least 3 characters')
    .max(50, 'Workspace slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Workspace slug can only contain lowercase letters, numbers, and hyphens')
    .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: 'Workspace slug cannot start or end with a hyphen',
    }),
});

// Schema for updating a workspace
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(255, 'Workspace name must be less than 255 characters').optional(),
  slug: z.string()
    .min(3, 'Workspace slug must be at least 3 characters')
    .max(50, 'Workspace slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Workspace slug can only contain lowercase letters, numbers, and hyphens')
    .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: 'Workspace slug cannot start or end with a hyphen',
    })
    .optional(),
});

// Schema for inviting a member to workspace
export const inviteMemberSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  role: workspaceMemberRoleSchema.default('member'),
});

// Schema for updating member role
export const updateMemberRoleSchema = z.object({
  user_id: z.string().uuid({ message: 'Please provide a valid user ID' }),
  role: workspaceMemberRoleSchema,
});

// Schema for workspace member filtering
export const workspaceMemberFilterSchema = z.object({
  role: workspaceMemberRoleSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Schema for workspace switching
export const workspaceSwitchSchema = z.object({
  workspace_slug: z.string().min(1, 'Workspace slug is required'),
});

// Type exports
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type CreateWorkspaceData = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceData = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberData = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleData = z.infer<typeof updateMemberRoleSchema>;
export type WorkspaceMemberFilter = z.infer<typeof workspaceMemberFilterSchema>;
export type WorkspaceSwitch = z.infer<typeof workspaceSwitchSchema>;
export type WorkspaceMemberRole = z.infer<typeof workspaceMemberRoleSchema>;