import { NextRequest, NextResponse } from 'next/server';
import { submitPdfSignatureRequest } from '@/lib/pdf-signatures';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const { signedPdfUrl } = await submitPdfSignatureRequest(token);

    return NextResponse.json({ success: true, signedPdfUrl }, { status: 200 });
  } catch (error) {
    console.error('Error submitting PDF signature request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit request' },
      { status: 500 }
    );
  }
}

