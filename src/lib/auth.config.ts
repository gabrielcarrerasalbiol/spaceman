import type { NextAuthConfig } from 'next-auth';

const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const isLoggedIn = !!auth;

      // Never gate Auth.js internal endpoints, or sign-in cannot complete.
      if (pathname.startsWith('/api/auth')) {
        return true;
      }

      const isProtectedRoute =
        pathname.startsWith('/dashboard') || pathname.startsWith('/api');

      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
