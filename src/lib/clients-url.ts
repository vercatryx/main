/**
 * Get the correct clients URL based on the environment
 * - Development: http://localhost:3000/clients
 * - Production: https://clients.vercatryx.com
 * 
 * Use this for full URLs (redirects, external links, etc.)
 */
export function getClientsUrl(): string {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If already on clients subdomain, return current origin
    if (hostname.startsWith('clients.')) {
      return window.location.origin;
    }
    
    // In development (localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:3000/clients`;
    }
    
    // In production, use the subdomain
    return `https://clients.vercatryx.com`;
  }
  
  // Server-side: check environment variables
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hostname = process.env.NEXT_PUBLIC_HOSTNAME || process.env.HOSTNAME;
  
  if (isDevelopment) {
    return `http://localhost:3000/clients`;
  }
  
  // If we have a hostname that starts with clients., use it
  if (hostname && hostname.startsWith('clients.')) {
    return `https://${hostname}`;
  }
  
  // Default to production subdomain
  return `https://clients.vercatryx.com`;
}

/**
 * Get the clients path (for use in Next.js router.push, Link href, etc.)
 * - Always returns /clients
 * - The middleware will handle routing to the subdomain in production
 */
export function getClientsPath(): string {
  return '/clients';
}

