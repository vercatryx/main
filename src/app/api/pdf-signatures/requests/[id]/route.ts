import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/permissions';
import { getPdfSignatureRequestById, deletePdfSignatureRequest } from '@/lib/pdf-signatures';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    const request = await getPdfSignatureRequestById(id);
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(request, { status: 200 });
  } catch (error) {
    console.error('Error fetching PDF signature request by id:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    await deletePdfSignatureRequest(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting PDF signature request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete request' },
      { status: 500 }
    );
  }
}

