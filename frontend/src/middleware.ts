import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // The student feedback analytics dashboard is a standalone tool with its own
  // authentication and is not part of the superadmin portal. Let it through so
  // it doesn't get swallowed by the superadmin redirect below.
  if (request.nextUrl.pathname.startsWith('/admin/feedback-analytics')) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/superadmin', request.url))
}

export const config = {
  matcher: ['/admin/:path*'],
}

