import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/contact",
  "/sign-up(.*)",
  "/sign-in(.*)",
  // Public sign links so external users can sign documents without an account
  "/sign/(.*)",
  // Public webhooks and APIs
  "/api/webhooks/clerk",
  "/api/availability(.*)",
  "/api/contact",
  // Public PDF signature endpoints used by the sign page
  "/api/pdf-signatures/public(.*)",
  // Public meeting token endpoint for guest access to public meetings
  "/api/meetings/(.*)/token",
  // Public access to meeting join links (authorization is enforced in route handlers)
  "/meetings/(.*)/join",
  // Admin availability tools
  "/admin/availability(.*)",
  // Email tracking pixel - must be public so email clients can load it
  "/api/admin/email/track/(.*)",
  // SEO files - sitemap and robots.txt
  "/sitemap.xml",
  "/robots.txt",
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect non-public routes and redirect to sign-in if not authenticated
  if (!isPublicRoute(req)) {
    const signInUrl = new URL("/sign-in", req.url);
    await auth.protect({
      unauthenticatedUrl: signInUrl.toString(),
      unauthorizedUrl: signInUrl.toString(),
    });
  }

  // Return without additional protection for public routes
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};