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
    // Don't rewrite public routes on subdomain - redirect to main domain instead
    if (url.pathname === "/contact" || url.pathname === "/sign-in" || url.pathname === "/sign-up") {
      const mainDomain = hostname.replace("clients.", "");
      return NextResponse.redirect(new URL(url.pathname, `${req.nextUrl.protocol}//${mainDomain}`));
    }

    // Protect /clients route on subdomain - redirect to sign-in on main domain if not authenticated
    // Use Clerk's protect method which handles authentication properly
    if (url.pathname === "/" || url.pathname === "/clients" || url.pathname.startsWith("/clients/")) {
      const mainDomain = hostname.replace("clients.", "");
      const signInUrl = new URL("/sign-in", `${req.nextUrl.protocol}//${mainDomain}`);
      // Add return URL so user comes back to subdomain after signing in
      signInUrl.searchParams.set("redirect_url", req.url);
      
      await auth.protect({
        unauthenticatedUrl: signInUrl.toString(),
        unauthorizedUrl: signInUrl.toString(),
      });
    }

    // If on subdomain root, rewrite to /clients
    if (url.pathname === "/") {
      return NextResponse.rewrite(new URL("/clients", req.url));
    }

    // If already on /clients path, allow it to pass through
    if (url.pathname === "/clients" || url.pathname.startsWith("/clients/")) {
      return NextResponse.next();
    }

    // For other paths on subdomain, rewrite to /clients path
    const newUrl = new URL(`/clients${url.pathname}`, req.url);
    newUrl.search = url.search;
    return NextResponse.rewrite(newUrl);
  }

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