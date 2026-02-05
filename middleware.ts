import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes and static files
  if (
    pathname.startsWith('/f/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  // Check for admin routes (except login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin_session')
    
    if (!sessionCookie?.value) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Check for admin API routes
  if (pathname.startsWith('/api/admin')) {
    const sessionCookie = request.cookies.get('admin_session')
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}

