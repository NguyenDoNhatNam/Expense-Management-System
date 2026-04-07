import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing admin routes (except login page)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Check for admin_user in cookies or redirect to login
    // Note: We can't access localStorage in middleware, so we use cookies
    const adminUser = request.cookies.get('admin_user');
    
    // If no admin_user cookie, redirect to admin login
    if (!adminUser) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const user = JSON.parse(adminUser.value);
      const adminRoles = ['admin', 'super_admin'];
      
      // Check if user has admin role
      if (!user.role || !adminRoles.includes(user.role)) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      // Invalid cookie, redirect to login
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
