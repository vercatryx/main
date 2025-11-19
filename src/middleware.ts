import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/contact",
  "/sign-up(.*)",
  "/sign-in(.*)",
  "/api/webhooks/clerk",
  "/api/availability(.*)",
  "/api/contact",
  "/admin/availability(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // Check if this is the clients subdomain
  if (hostname.startsWith("clients.")) {
    // If on subdomain root, redirect to /clients
    if (url.pathname === "/") {
      return NextResponse.rewrite(new URL("/clients", req.url));
    }
    // For other paths on subdomain, keep the URL but rewrite to /clients path
    if (!url.pathname.startsWith("/clients")) {
      const newUrl = new URL(`/clients${url.pathname}`, req.url);
      newUrl.search = url.search;
      return NextResponse.rewrite(newUrl);
    }
  }

  // Allow public routes without protection
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Return without additional protection for public routes
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};