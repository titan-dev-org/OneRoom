// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  const { data: { session } } = await supabase.auth.getSession()

  // Cek path
  const path = request.nextUrl.pathname
  const isAuthPage = path === '/login' || path === '/register'
  const isProtectedPage = path === '/' || path.startsWith('/profile') || path.startsWith('/settings')
  const isAdminPage = path.startsWith('/admin')
  const isApiRoute = path.startsWith('/api')

  // Skip untuk API routes
  if (isApiRoute) {
    return response
  }

  // Jika user login dan mencoba akses halaman auth (login/register)
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Jika user tidak login dan mencoba akses protected page
  if (!session && isProtectedPage) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Jika user tidak login dan mencoba akses admin
  if (!session && isAdminPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Jika user login dan bukan admin mencoba akses admin
  if (session && isAdminPage) {
    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
            }
