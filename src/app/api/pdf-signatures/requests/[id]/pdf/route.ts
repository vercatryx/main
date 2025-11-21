import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/permissions';
import { getPdfSignatureRequestById, getPdfKeyFromUrl } from '@/lib/pdf-signatures';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }
  return Buffer.concat(chunks);
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    const request = await getPdfSignatureRequestById(id);
    if (!request || !request.pdf_file_url) {
      console.error('[PDF admin] No request or pdf_file_url found for id', id);
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    const key = getPdfKeyFromUrl(request.pdf_file_url);
    console.log('[PDF admin] Streaming PDF from R2', {
      bucket: R2_BUCKET_NAME,
      key,
    });

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const object = await r2Client.send(command);
    if (!object.Body) {
      console.error('[PDF admin] R2 object has no Body', { key });
      return NextResponse.json({ error: 'Failed to load PDF' }, { status: 500 });
    }

    const body = await streamToBuffer(object.Body);
    console.log('[PDF admin] Loaded PDF bytes', { key, size: body.length });

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Error streaming PDF for request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load PDF' },
      { status: 500 }
    );
  }
}


