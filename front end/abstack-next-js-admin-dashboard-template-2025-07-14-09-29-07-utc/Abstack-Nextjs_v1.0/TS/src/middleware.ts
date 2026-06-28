import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import createMiddleware from 'next-intl/middleware'
import { routing } from './lib/i18n/routing'
import { ROLE_HOME_PATHS } from './lib/auth/roles'
import type { Role } from './lib/auth/roles'
import { isPublicPath, isStaticAsset, getRoleFromPath } from './lib/auth/middlewareUtils'

const intlMiddleware = createMiddleware(routing)

function forbiddenJson(message: string, status: 401 | 403): NextResponse {
  return new NextResponse(JSON.stringify({ statusCode: status, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through next-auth API routes and static files
  if (pathname.startsWith('/api/auth') || isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  const isApiRoute = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')

  // Root → login redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Public pages — apply i18n and let through
  if (isPublicPath(pathname)) {
    return intlMiddleware(request) ?? NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Unauthenticated
  if (!token) {
    if (isApiRoute) return forbiddenJson('Unauthorized', 401)
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // MFA pending — only /auth/mfa allowed (everything else blocked)
  if (token.mfaPending) {
    const isMfaPage = pathname.startsWith('/auth/mfa')
    if (!isMfaPage) {
      if (isApiRoute) return forbiddenJson('MFA verification required', 403)
      return NextResponse.redirect(new URL('/auth/mfa', request.url))
    }
    return intlMiddleware(request) ?? NextResponse.next()
  }

  const userRole = token.role as Role | undefined
  if (!userRole) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Role-based path guard
  const requiredRole = getRoleFromPath(pathname)
  if (requiredRole && requiredRole !== userRole) {
    if (isApiRoute) return forbiddenJson('Forbidden', 403)
    // Redirect to the /403 page with originating path for context
    const forbiddenUrl = new URL('/403', request.url)
    forbiddenUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(forbiddenUrl)
  }

  return intlMiddleware(request) ?? NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons|sw.js|favicon.ico|.*\\..*).*)'],
}
