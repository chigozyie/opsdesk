import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  await requireAuth();
  
  // Redirect to workspace selection - users should access workspaces via /app/[workspaceSlug]/
  redirect('/workspace/select');
}