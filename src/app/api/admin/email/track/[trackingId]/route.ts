import { NextRequest, NextResponse } from "next/server";
import { recordEmailOpen } from "@/lib/email-tracking";

/**
 * Tracking pixel endpoint - returns a 1x1 transparent PNG
 * and records that the email was opened
 * Usage: /api/admin/email/track/[trackingId]?format=png
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    // Get the raw URL path to extract tracking ID manually
    const urlPath = new URL(request.url).pathname;
    console.log(`[Email Tracking] Raw URL path: ${urlPath}`);
    console.log(`[Email Tracking] Full URL: ${request.url}`);
    
    let trackingId = '';
    
    // Try to get from params first
    try {
      const resolvedParams = await params;
      trackingId = resolvedParams?.trackingId || '';
      console.log(`[Email Tracking] Got tracking ID from params: ${trackingId}`);
    } catch (paramError) {
      console.log(`[Email Tracking] Params extraction failed, extracting from URL:`, paramError);
    }
    
    // If params didn't work or tracking ID is empty, extract directly from URL path
    if (!trackingId || trackingId.length < 10) {
      const pathParts = urlPath.split('/api/admin/email/track/');
      if (pathParts.length > 1) {
        trackingId = pathParts[1];
        // Remove any trailing slashes or query strings
        trackingId = trackingId.split('/')[0].split('?')[0].split('#')[0];
        console.log(`[Email Tracking] Extracted tracking ID from URL path: ${trackingId}`);
      }
    }
    
    // Decode the tracking ID in case it's URL encoded
    try {
      const decoded = decodeURIComponent(trackingId);
      // Only use decoded if it's different and looks valid
      if (decoded !== trackingId && decoded.length > 10) {
        trackingId = decoded;
      }
    } catch {
      // If decoding fails, use as-is
      console.log(`[Email Tracking] URL decode failed, using tracking ID as-is`);
    }
    
    // Clean up the tracking ID - remove file extensions
    trackingId = trackingId.replace(/\.png$/i, '').trim();
    
    // Handle quoted-printable encoding artifacts
    // Email clients break long lines with = and newlines, and encode = as =3D
    // Remove quoted-printable artifacts: =3D (encoded =), =\n or =\r\n (soft breaks), and any standalone =
    const originalTrackingId = trackingId;
    trackingId = trackingId
      .replace(/=3D/gi, '') // Remove encoded equals signs
      .replace(/=\r?\n/g, '') // Remove soft line breaks (=\n or =\r\n)
      .replace(/=$/g, '') // Remove trailing = from line breaks
      .replace(/=/g, ''); // Remove any remaining = characters
    
    console.log(`[Email Tracking] Final tracking ID (after cleaning): ${trackingId}`);
    if (originalTrackingId !== trackingId) {
      console.log(`[Email Tracking] Cleaned tracking ID from "${originalTrackingId}" to "${trackingId}"`);
      console.log(`[Email Tracking] This indicates quoted-printable encoding artifacts were removed`);
    }

    // Handle quoted-printable encoding artifacts
    // Email clients break long lines with = and encode = as =3D
    // Also handle = at end of lines (quoted-printable soft line breaks)
    trackingId = trackingId.replace(/=3D/gi, '').replace(/=\r?\n/g, '').replace(/=/g, '');
    
    if (!trackingId || trackingId === "undefined" || trackingId.length < 10) {
      console.error(`[Email Tracking] Invalid tracking ID after cleaning: ${trackingId}`);
      // Return transparent pixel even if tracking fails
      // Cast to any to satisfy TypeScript (Buffer works at runtime)
      return new NextResponse(getTransparentPixel() as any, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    console.log(`[Email Tracking] Processing tracking ID (length: ${trackingId.length}): ${trackingId}`);

    // Record email open (await it to ensure it completes, but don't fail the request)
    try {
      console.log(`[Email Tracking] Attempting to record open for tracking ID: ${trackingId}`);
      await recordEmailOpen(trackingId);
      console.log(`[Email Tracking] Successfully recorded email open for tracking ID: ${trackingId}`);
    } catch (error) {
      console.error(`[Email Tracking] Error recording email open for ${trackingId}:`, error);
      // Log the full error details
      if (error instanceof Error) {
        console.error(`[Email Tracking] Error message: ${error.message}`);
        console.error(`[Email Tracking] Error stack: ${error.stack}`);
      }
      // Don't fail the request if tracking fails - still return the pixel
    }

    // Return 1x1 transparent PNG
    // Cast to any to satisfy TypeScript (Buffer works at runtime)
    return new NextResponse(getTransparentPixel() as any, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error in tracking pixel endpoint:", error);
    // Still return the pixel even if there's an error
    // Cast to any to satisfy TypeScript (Buffer works at runtime)
    return new NextResponse(getTransparentPixel() as any, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}

/**
 * Returns a 1x1 transparent PNG as a Buffer
 * This is a minimal valid PNG file
 */
function getTransparentPixel(): Buffer {
  // 1x1 transparent PNG in base64
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  return Buffer.from(base64, "base64");
}

