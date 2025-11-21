import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/permissions';
import { getSignaturesForRequest } from '@/lib/pdf-signatures';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    const signatures = await getSignaturesForRequest(id);
    return NextResponse.json({ signatures }, { status: 200 });
  } catch (error) {
    console.error('Error fetching signatures for request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load signatures' },
      { status: 500 }
    );
  }
}


