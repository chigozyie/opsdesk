import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from './client-factory';

export async function updateSession(request: NextRequest) {
  const { client: supabase, response: supabaseResponse } = createMiddlewareSupabaseClient(request);

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth', '/'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect unauthenticated users to login page
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Handle workspace routing and access validation
  if (user && request.nextUrl.pathname.startsWith('/app/')) {
    const pathSegments = request.nextUrl.pathname.split('/');
    const workspaceSlug = pathSegments[2];

    if (workspaceSlug) {
      // Validate workspace access
      const { data: workspace } = await supabase
        .from('workspaces')
        .select(`
          id,
          slug,
          workspace_members!inner (
            role
          )
        `)
        .eq('slug', workspaceSlug)
        .eq('workspace_members.user_id', user.id)
        .single();

      // If user doesn't have access to this workspace, redirect to workspace selection
      if (!workspace) {
        const url = request.nextUrl.clone();
        url.pathname = '/workspace/select';
        return NextResponse.redirect(url);
      }

      // Add workspace context to headers for downstream components
      const response = NextResponse.next({
        request: {
          headers: new Headers(request.headers),
        },
      });
      
      response.headers.set('x-workspace-id', (workspace as any).id);
      response.headers.set('x-workspace-slug', workspaceSlug);
      response.headers.set('x-user-role', (workspace as any).workspace_members[0]?.role || 'viewer');
      
      // Copy over the cookies from supabase response
      const cookies = supabaseResponse.cookies.getAll();
      cookies.forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie);
      });
      
      return response;
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object here instead of the supabaseResponse object

  return supabaseResponse;
}