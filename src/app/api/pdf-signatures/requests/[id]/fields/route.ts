import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/permissions';
import { savePdfSignatureFields } from '@/lib/pdf-signatures';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    const body = await req.json();
    const fields = Array.isArray(body?.fields) ? body.fields : [];

    const saved = await savePdfSignatureFields({
      requestId: id,
      fields: fields.map((f: any) => ({
        page_number: Number(f.page_number) || 1,
        x: Number(f.x),
        y: Number(f.y),
        width: Number(f.width),
        height: Number(f.height),
        label: typeof f.label === 'string' ? f.label : null,
        field_type: f.field_type === 'data_entry' ? 'data_entry' : 'signature',
      })),
    });

    return NextResponse.json({ fields: saved }, { status: 200 });
  } catch (error) {
    console.error('Error saving PDF signature fields:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save fields' },
      { status: 500 }
    );
  }
}


