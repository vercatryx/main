import { NextRequest, NextResponse } from 'next/server';
import { getPdfSignatureRequestByToken, getSignaturesForRequest } from '@/lib/pdf-signatures';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const request = await getPdfSignatureRequestByToken(token);

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Get the latest signed PDF URL from the signatures table
    const signatures = await getSignaturesForRequest(request.id);
    const signedPdfUrl = signatures.length > 0 && signatures[0].signed_pdf_url 
      ? signatures[0].signed_pdf_url 
      : null;

    return NextResponse.json({ signedPdfUrl }, { status: 200 });
  } catch (error) {
    console.error('Error fetching signed PDF URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch signed PDF URL' },
      { status: 500 }
    );
  }
}

