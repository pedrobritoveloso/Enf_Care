import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const userRole = token?.role as string | undefined;

    // 1. Redirecionar ENFERMEIRO se tentar aceder a rotas de ADMIN
    if (path.startsWith("/admin") && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 2. Redirecionar ADMIN se tentar aceder a rotas de ENFERMEIRO
    if (path.startsWith("/enfermeiro") && userRole !== "ENFERMEIRO") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/enfermeiro/:path*",
  ],
};