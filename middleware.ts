import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'bolao_session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicRoutes = ['/login', '/register', '/auth/callback', '/auth/error']
  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r))
  const isApiRoute = pathname.startsWith('/api/')

  // Skip middleware for API routes (they do their own auth)
  if (isApiRoute) return NextResponse.next()

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value

  // Root redirect
  if (pathname === '/') {
    if (sessionToken) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect non-public routes
  if (!isPublicRoute && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from login/register
  if (isPublicRoute && sessionToken && pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
