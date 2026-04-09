import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminRoles = ['admin', 'super_admin'];
  const adminUser = request.cookies.get('admin_user');

  const parseAdminCookie = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch {
        return null;
      }
    }
  };

  // If already authenticated as admin, accessing /admin/login should go to /admin.
  if (pathname === '/admin/login' && adminUser) {
    const user = parseAdminCookie(adminUser.value);
    if (user?.role && adminRoles.includes(user.role)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Check if accessing admin routes (except login page)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // If no admin_user cookie, redirect to admin login
    if (!adminUser) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const user = parseAdminCookie(adminUser.value);

    // Check if user has admin role
    if (!user?.role || !adminRoles.includes(user.role)) {
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
