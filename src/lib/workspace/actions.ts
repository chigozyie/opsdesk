'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/client-factory';
import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(255, 'Name too long'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with hyphen')
});

export async function createWorkspace(formData: FormData) {
  const user = await requireAuth();
  
  // Use regular client for checking existing workspace
  const supabase = createClient();
  
  // Validate input
  const result = CreateWorkspaceSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug')
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message || 'Invalid input'
    };
  }

  const { name, slug } = result.data;

  try {
    // Check if slug is already taken
    const { data: existingWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingWorkspace) {
      return {
        error: 'This workspace URL is already taken. Please choose a different one.'
      };
    }

    // Create service role client for workspace creation (bypasses RLS)
    const serviceSupabase = createServiceSupabaseClient();
    
    // Create workspace with explicit user ID
    const { data: workspace, error: workspaceError } = await serviceSupabase
      .from('workspaces')
      .insert({
        name,
        slug,
        created_by: user.id
      })
      .select()
      .single();

    if (workspaceError || !workspace) {
      console.error('Error creating workspace:', workspaceError);
      return {
        error: 'Failed to create workspace. Please try again.'
      };
    }

    // Add creator as admin member
    const { error: memberError } = await serviceSupabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'admin'
      });

    if (memberError) {
      console.error('Error adding workspace member:', memberError);
      // Try to clean up the workspace
      await serviceSupabase.from('workspaces').delete().eq('id', workspace.id);
      return {
        error: 'Failed to set up workspace membership. Please try again.'
      };
    }

    // Redirect to the new workspace
    redirect(`/app/${slug}/dashboard`);
  } catch (error: any) {
    // Don't log redirect errors as they are expected
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error; // Re-throw redirect errors so they work properly
    }
    console.error('Unexpected error creating workspace:', error);
    return {
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

export async function generateSlugFromName(name: string): Promise<string> {
  // Generate a slug from the workspace name
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure minimum length
  if (slug.length < 3) {
    slug = `workspace-${Date.now()}`;
  }

  const supabase = createClient();
  
  // Check if slug is available, if not, append number
  let finalSlug = slug;
  let counter = 1;
  
  while (true) {
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', finalSlug)
      .single();
    
    if (!data) {
      break; // Slug is available
    }
    
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return finalSlug;
}

export async function getUserWorkspaces() {
  const user = await requireAuth();
  const supabase = createClient();

  const { data: workspaces, error } = await supabase
    .from('workspace_members')
    .select(`
      role,
      workspaces (
        id,
        slug,
        name,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false, foreignTable: 'workspaces' });

  if (error) {
    console.error('Error fetching user workspaces:', error);
    return [];
  }

  return (workspaces as any[])
    .filter((item: any) => item.workspaces)
    .map((item: any) => ({
      id: item.workspaces.id,
      slug: item.workspaces.slug,
      name: item.workspaces.name,
      created_at: item.workspaces.created_at,
      role: item.role
    }));
}

export async function getWorkspaceBySlug(slug: string) {
  const user = await requireAuth();
  const supabase = createClient();

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select(`
      id,
      slug,
      name,
      created_at,
      created_by,
      workspace_members!inner (
        role
      )
    `)
    .eq('slug', slug)
    .eq('workspace_members.user_id', user.id)
    .single();

  if (error || !workspace) {
    return null;
  }

  const workspaceData = workspace as any;
  return {
    id: workspaceData.id,
    slug: workspaceData.slug,
    name: workspaceData.name,
    created_at: workspaceData.created_at,
    created_by: workspaceData.created_by,
    role: workspaceData.workspace_members[0]?.role as 'admin' | 'member' | 'viewer'
  };
}

// Member Management Actions

export async function inviteMember(formData: FormData) {
  const user = await requireAuth();
  const supabase = createClient();

  const email = formData.get('email') as string;
  const role = formData.get('role') as 'admin' | 'member' | 'viewer';
  const workspaceId = formData.get('workspaceId') as string;

  // Validate input
  if (!email || !role || !workspaceId) {
    return {
      error: 'Email, role, and workspace are required'
    };
  }

  if (!['admin', 'member', 'viewer'].includes(role)) {
    return {
      error: 'Invalid role specified'
    };
  }

  try {
    // Check if current user is admin of this workspace
    const { data: currentMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || (currentMembership as any).role !== 'admin') {
      return {
        error: 'Only workspace admins can invite members'
      };
    }

    // Check if user exists in auth.users
    await supabase
      .from('workspace_members')
      .select(`
        id,
        role,
        user_id
      `)
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    // For now, we'll create a simple invitation system
    // In a real app, you'd send an email invitation
    
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id) // This would be the invited user's ID in a real system
      .single();

    if (existingMember) {
      return {
        error: 'User is already a member of this workspace'
      };
    }

    // Note: In a real implementation, you would:
    // 1. Send an email invitation with a unique token
    // 2. Create a pending_invitations table
    // 3. Allow users to accept/decline invitations
    // 4. Only add to workspace_members after acceptance

    return {
      success: true,
      message: `Invitation would be sent to ${email} with role ${role}. (Email system not implemented in this demo)`
    };

  } catch (error) {
    console.error('Error inviting member:', error);
    return {
      error: 'Failed to invite member. Please try again.'
    };
  }
}

export async function updateMemberRole(formData: FormData) {
  const user = await requireAuth();
  const supabase = createClient();

  const memberId = formData.get('memberId') as string;
  const newRole = formData.get('role') as 'admin' | 'member' | 'viewer';
  const workspaceId = formData.get('workspaceId') as string;
  const previousRole = formData.get('previousRole') as string;
  const reason = formData.get('reason') as string;
  const memberEmail = formData.get('memberEmail') as string;

  if (!memberId || !newRole || !workspaceId) {
    return {
      error: 'Member ID, role, and workspace are required'
    };
  }

  if (!['admin', 'member', 'viewer'].includes(newRole)) {
    return {
      error: 'Invalid role specified'
    };
  }

  try {
    // Check if current user is admin of this workspace
    const { data: currentMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || (currentMembership as any).role !== 'admin') {
      return {
        error: 'Only workspace admins can update member roles'
      };
    }

    // Get current member details for audit logging
    const { data: currentMemberData } = await supabase
      .from('workspace_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!currentMemberData) {
      return {
        error: 'Member not found'
      };
    }

    const actualPreviousRole = (currentMemberData as any).role;

    // Prevent changing your own role
    if ((currentMemberData as any).user_id === user.id) {
      return {
        error: 'You cannot change your own role'
      };
    }

    // Update member role
    const { error: updateError } = await (supabase as any)
      .from('workspace_members')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return {
        error: 'Failed to update member role. Please try again.'
      };
    }

    // Log the role change for audit purposes
    try {
      // In a real implementation, you would insert into an audit_log table
      // For now, we'll just log to console with structured data
      const auditLogEntry = {
        action: 'member_role_changed',
        workspace_id: workspaceId,
        target_user_id: (currentMemberData as any).user_id,
        target_member_id: memberId,
        target_email: memberEmail,
        previous_role: actualPreviousRole,
        new_role: newRole,
        changed_by: user.id,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
        ip_address: 'unknown', // In a real app, you'd capture this
        user_agent: 'unknown'  // In a real app, you'd capture this
      };

      console.log('AUDIT LOG - Role Change:', JSON.stringify(auditLogEntry, null, 2));

      // TODO: In a production system, insert into audit_log table:
      // await supabase.from('audit_log').insert(auditLogEntry);
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return {
      success: true,
      message: `Member role updated from ${actualPreviousRole} to ${newRole}${reason ? ` (${reason})` : ''}`
    };

  } catch (error) {
    console.error('Error updating member role:', error);
    return {
      error: 'Failed to update member role. Please try again.'
    };
  }
}

export async function removeMember(formData: FormData) {
  const user = await requireAuth();
  const supabase = createClient();

  const memberId = formData.get('memberId') as string;
  const workspaceId = formData.get('workspaceId') as string;
  const memberEmail = formData.get('memberEmail') as string;
  const reason = formData.get('reason') as string;

  if (!memberId || !workspaceId) {
    return {
      error: 'Member ID and workspace are required'
    };
  }

  try {
    // Check if current user is admin of this workspace
    const { data: currentMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || (currentMembership as any).role !== 'admin') {
      return {
        error: 'Only workspace admins can remove members'
      };
    }

    // Get member details before removal for audit logging
    const { data: memberToRemove } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!memberToRemove) {
      return {
        error: 'Member not found'
      };
    }

    // Prevent removing yourself
    if ((memberToRemove as any).user_id === user.id) {
      return {
        error: 'You cannot remove yourself from the workspace'
      };
    }

    // Remove member
    const { error: removeError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (removeError) {
      console.error('Error removing member:', removeError);
      return {
        error: 'Failed to remove member. Please try again.'
      };
    }

    // Log the member removal for audit purposes
    try {
      const auditLogEntry = {
        action: 'member_removed',
        workspace_id: workspaceId,
        target_user_id: (memberToRemove as any).user_id,
        target_member_id: memberId,
        target_email: memberEmail,
        target_role: (memberToRemove as any).role,
        removed_by: user.id,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
        ip_address: 'unknown', // In a real app, you'd capture this
        user_agent: 'unknown'  // In a real app, you'd capture this
      };

      console.log('AUDIT LOG - Member Removed:', JSON.stringify(auditLogEntry, null, 2));

      // TODO: In a production system, insert into audit_log table:
      // await supabase.from('audit_log').insert(auditLogEntry);
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return {
      success: true,
      message: `Member ${memberEmail || 'user'} removed successfully${reason ? ` (${reason})` : ''}`
    };

  } catch (error) {
    console.error('Error removing member:', error);
    return {
      error: 'Failed to remove member. Please try again.'
    };
  }
}

export async function getWorkspaceMembers(workspaceId: string) {
  const user = await requireAuth();
  const supabase = createClient();

  try {
    // Verify user has access to this workspace
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!userMembership) {
      throw new Error('Access denied to workspace');
    }

    // Get all workspace members
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        role,
        created_at,
        user_id
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }

    // Note: In a real app, you'd join with auth.users to get email/name
    // For now, we'll return the user_id as a placeholder
    return (members as any[]).map((member: any) => ({
      id: member.id,
      userId: member.user_id,
      email: `user-${member.user_id.slice(0, 8)}@example.com`, // Placeholder
      role: member.role,
      joinedAt: member.created_at,
      isCurrentUser: member.user_id === user.id
    }));

  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return [];
  }
}