import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { checkLoginRateLimit, recordLoginFailure } from "@/server/auth/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  ip: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        ip: { label: "IP", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }
        const { email, password, ip } = parsed.data;
        const ipKey = ip ?? "unknown";

        const limited = checkLoginRateLimit(email, ipKey);
        if (!limited.ok) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.isActive) {
          recordLoginFailure(email, ipKey);
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          recordLoginFailure(email, ipKey);
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }

      if (trigger === "update" && session) {
        const s = session as { mustChangePassword?: boolean };
        if (typeof s.mustChangePassword === "boolean") {
          token.mustChangePassword = s.mustChangePassword;
        }
      }

      // Re-check isActive periodically via DB when token has id
      const tokenUserId =
        typeof token.id === "string" && token.id.length > 0 ? token.id : null;
      if (tokenUserId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenUserId },
          select: {
            isActive: true,
            role: true,
            mustChangePassword: true,
            name: true,
            email: true,
          },
        });
        if (!dbUser || !dbUser.isActive) {
          // Invalidate by clearing token subject
          return {
            ...token,
            id: "",
            role: Role.EMPLOYEE,
            mustChangePassword: false,
          };
        }
        token.role = dbUser.role;
        token.mustChangePassword = dbUser.mustChangePassword;
        token.name = dbUser.name;
        token.email = dbUser.email;
      }

      return token;
    },
    async session({ session, token }) {
      const tokenUserId =
        typeof token.id === "string" && token.id.length > 0 ? token.id : "";
      if (!tokenUserId) {
        // Force unauthenticated session shape
        session.user = {
          ...session.user,
          id: "",
          role: Role.EMPLOYEE,
          mustChangePassword: false,
        };
        return session;
      }
      session.user.id = tokenUserId;
      session.user.role =
        token.role === Role.ADMIN || token.role === Role.EMPLOYEE
          ? token.role
          : Role.EMPLOYEE;
      session.user.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      const isLoggedIn = !!session?.user?.id;

      if (path.startsWith("/login")) {
        return true;
      }
      if (path.startsWith("/api/auth")) {
        return true;
      }
      if (!isLoggedIn) {
        return false;
      }
      return true;
    },
  },
  trustHost: true,
});
