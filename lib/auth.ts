import NextAuth from "next-auth"
import { authConfig } from "./auth-config"

// Full NextAuth instance with MongoDB - used in API routes
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)

