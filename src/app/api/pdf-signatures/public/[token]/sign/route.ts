import { NextRequest, NextResponse } from 'next/server';
import { saveSignatureForRequest } from '@/lib/pdf-signatures';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await req.json();

    const signerName = typeof body?.signerName === 'string' ? body.signerName : undefined;
    const signerEmail = typeof body?.signerEmail === 'string' ? body.signerEmail : undefined;
    const fieldId = typeof body?.fieldId === 'string' ? body.fieldId : undefined;
    const signatureImageDataUrl =
      typeof body?.signatureImageDataUrl === 'string' ? body.signatureImageDataUrl : '';

    if (!signatureImageDataUrl) {
      return NextResponse.json(
        { error: 'Signature image data is required' },
        { status: 400 }
      );
    }

    if (!fieldId) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      );
    }

    // Extract IP address - check multiple headers in order of preference
    // Priority: Cloudflare -> x-forwarded-for -> x-real-ip -> x-client-ip -> connection
    let ip: string | undefined;
    
    // Cloudflare provides the real client IP
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    if (cfConnectingIp) {
      ip = cfConnectingIp.trim();
    } else {
      // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2)
      // We want the first one which is the original client IP
      const forwardedFor = req.headers.get('x-forwarded-for');
      if (forwardedFor) {
        // x-forwarded-for can be a comma-separated list: "client, proxy1, proxy2"
        const firstIp = forwardedFor.split(',')[0].trim();
        // Filter out localhost addresses in production (but keep them in development)
        if (firstIp && firstIp !== '::1' && firstIp !== '127.0.0.1') {
          ip = firstIp;
        } else if (firstIp) {
          // Keep localhost for development
          ip = firstIp;
        }
      }
    }
    
    // Fallback to other headers
    if (!ip) {
      ip = req.headers.get('x-real-ip')?.trim() || 
           req.headers.get('x-client-ip')?.trim() || 
           undefined;
    }
    
    // Try to get from connection info (Next.js)
    if (!ip) {
      try {
        // Access the connection info if available
        const connection = (req as any).connection;
        if (connection?.remoteAddress) {
          ip = connection.remoteAddress;
        }
      } catch {
        // Ignore if connection info is not available
      }
    }
    
    // Log for debugging (remove in production if desired)
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      console.log('IP extraction debug:', {
        'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
        'x-forwarded-for': req.headers.get('x-forwarded-for'),
        'x-real-ip': req.headers.get('x-real-ip'),
        'x-client-ip': req.headers.get('x-client-ip'),
        'all-headers': Object.fromEntries(req.headers.entries()),
        extractedIp: ip,
      });
    }

    const { signedPdfUrl } = await saveSignatureForRequest({
      token,
      signerName,
      signerEmail,
      signerIp: ip,
      fieldId,
      signatureImageDataUrl,
    });

    return NextResponse.json({ signedPdfUrl }, { status: 200 });
  } catch (error) {
    console.error('Error saving PDF signature:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save signature' },
      { status: 500 }
    );
  }
}


