import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/public/',      // Public shareable edit links
  '/login',        // Login page
  '/api/auth/',    // Auth API routes
  '/_next/',       // Next.js internals
  '/favicon.ico',
  '/icon',
  '/apple-icon',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Check for auth cookie
  const authCookie = request.cookies.get('arb-auth')
  
  if (!authCookie) {
    // Redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  try {
    // Parse the cookie value
    const authData = JSON.parse(authCookie.value)
    const { timestamp } = authData
    
    // Check if session has expired (1 hour = 3600000 ms)
    const ONE_HOUR = 60 * 60 * 1000
    const now = Date.now()
    
    if (now - timestamp > ONE_HOUR) {
      // Session expired, clear cookie and redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      loginUrl.searchParams.set('expired', 'true')
      
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('arb-auth')
      return response
    }
    
    // Valid session, allow request
    return NextResponse.next()
  } catch (e) {
    // Invalid cookie format, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('arb-auth')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

