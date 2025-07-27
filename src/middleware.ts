import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Allow public routes
  if (
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const payload = await verifyToken(token.value)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Add user info to headers for route handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.user.id.toString())
    requestHeaders.set('x-user-role', payload.user.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
