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
    const signatureImageDataUrl =
      typeof body?.signatureImageDataUrl === 'string' ? body.signatureImageDataUrl : '';

    if (!signatureImageDataUrl) {
      return NextResponse.json(
        { error: 'Signature image data is required' },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      req.ip ||
      undefined;

    const { signedPdfUrl } = await saveSignatureForRequest({
      token,
      signerName,
      signerEmail,
      signerIp: ip,
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


