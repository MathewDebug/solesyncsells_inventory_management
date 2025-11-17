import NextAuth from "next-auth"

// Minimal auth config for middleware (Edge runtime compatible)
// This doesn't import MongoDB or bcrypt, only checks JWT sessions
// Providers array is required by NextAuth v5 even if empty
export const { auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [], // Empty array - providers only needed for actual authentication
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    },
  },
})

