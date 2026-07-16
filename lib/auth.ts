import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// NextAuth options - dùng chung cho route handler + getServerSession.
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" }, // JWT: không cần DB cho session
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = (token.sub ?? token.email ?? "") as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Trang chủ có nút login, không cần trang riêng
  },
};
