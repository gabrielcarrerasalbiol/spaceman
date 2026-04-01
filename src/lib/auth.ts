import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import authConfig from '@/lib/auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          if (!prisma) {
            console.error('Prisma client is not initialized');
            return null;
          }

          const user = await prisma.users.findUnique({
            where: { email: credentials.email as string },
            include: { role: true },
          });

          if (!user || !user.password) {
            return null;
          }

          // Check if user is banned or inactive
          if (user.banned || !user.active) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!passwordMatch) {
            return null;
          }

          // Update last login
          await prisma.users.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.username,
            role: user.role?.name || 'USER',
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
