import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/contact(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/contact(.*)",
  "/api/availability(.*)",
  "/api/meeting-requests/available-slots(.*)", // Public - get available slots
  "/payments(.*)",
  "/api/payments/request(.*)",
  "/api/payments/create-intent(.*)",
  "/api/payments/send-invoice(.*)",
]);

// Routes that should be indexed by search engines
const indexableRoutes = ["/", "/contact"];

// Check if route should be public based on method (for routes that handle auth internally)
export default clerkMiddleware(async (auth, request) => {
  const url = request.nextUrl.pathname;
  
  // Allow POST to /api/meeting-requests (public endpoint, handles auth internally)
  if (url === '/api/meeting-requests' && request.method === 'POST') {
    const response = NextResponse.next();
    return response;
  }
  
  // All other routes check public route matcher
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  
  // Set X-Robots-Tag header for indexable public routes
  if (indexableRoutes.includes(url)) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'index, follow');
    return response;
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Protect all API routes (including /api/admin/payments)
    '/api(.*)',
    // Protect admin and client pages
    '/admin(.*)',
    '/clients(.*)',
    // Add other protected paths like /projects, /meetings, etc.
    '/projects(.*)',
    '/meetings(.*)',
    '/payments(.*)',  // Payments page is public (no authentication required)
  ],
};