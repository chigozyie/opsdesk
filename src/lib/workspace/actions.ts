'use server';

import { createClient } from '@/lib/supabase/server';
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
  const supabase = createClient();

  // Validate input
  const result = CreateWorkspaceSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug')
  });

  if (!result.success) {
    return {
      error: result.error.errors[0].message
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

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug,
        created_by: user.id
      })
      .select()
      .single();

    if (workspaceError) {
      console.error('Error creating workspace:', workspaceError);
      return {
        error: 'Failed to create workspace. Please try again.'
      };
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'admin'
      });

    if (memberError) {
      console.error('Error adding workspace member:', memberError);
      // Try to clean up the workspace
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return {
        error: 'Failed to set up workspace membership. Please try again.'
      };
    }

    // Redirect to the new workspace
    redirect(`/app/${slug}/dashboard`);
  } catch (error) {
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

  return workspaces.map(item => ({
    ...item.workspaces,
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

  return {
    ...workspace,
    role: workspace.workspace_members[0]?.role
  };
}