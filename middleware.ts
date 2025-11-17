import { auth } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isPublicRoute = 
    req.nextUrl.pathname === "/login" || 
    req.nextUrl.pathname === "/signup"
  
  if (!req.auth && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  
  // Redirect authenticated users away from login/signup pages
  if (req.auth && isPublicRoute) {
    return NextResponse.redirect(new URL("/", req.url))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

