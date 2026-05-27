import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { assertPublicSupabaseConfig } from '@/lib/supabase/config'
import { logSupabaseError } from '@/lib/supabase/errors'
import { normalizePermissions, routePermission } from '@/lib/permissions'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  let config

  try {
    config = assertPublicSupabaseConfig()
  } catch (error) {
    const classified = logSupabaseError('middleware.env', error)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Supabase configuration error', kind: classified.kind },
        { status: 500 },
      )
    }

    return supabaseResponse
  }

  const supabase = createServerClient(
    config.url,
    config.publicKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    logSupabaseError('middleware.getUser', authError)
  }

  // Auth pages - redirect to dashboard if already logged in
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Protected pages - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/inbox', '/contacts', '/tasks', '/crm', '/pipelines', '/broadcasts', '/automations', '/flows', '/settings']
  if (!user && protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    const permission = routePermission(request.nextUrl.pathname)
    if (permission) {
      const { data: member } = await supabase
        .from('team_members')
        .select('permissions, status')
        .eq('user_id', user.id)
        .maybeSingle()

      const isCollaborator = !!member
      const allowed =
        !isCollaborator ||
        (member.status === 'active' && normalizePermissions(member.permissions).includes(permission))

      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('denied', permission)
        return NextResponse.redirect(url)
      }
    }
  }

  // API routes that need auth (not webhooks)
  if (!user && request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
      !request.nextUrl.pathname.includes('/webhook')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
