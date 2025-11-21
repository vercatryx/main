import { NextRequest, NextResponse } from 'next/server';
import { getPdfSignatureRequestByToken } from '@/lib/pdf-signatures';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const request = await getPdfSignatureRequestByToken(token);

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(request, { status: 200 });
  } catch (error) {
    console.error('Error fetching public PDF signature request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load request' },
      { status: 500 }
    );
  }
}


