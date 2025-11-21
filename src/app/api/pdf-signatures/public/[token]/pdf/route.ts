import { NextRequest, NextResponse } from 'next/server';
import { getPdfSignatureRequestByToken, getPdfKeyFromUrl } from '@/lib/pdf-signatures';
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
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const request = await getPdfSignatureRequestByToken(token);
    if (!request || !request.pdf_file_url) {
      console.error('[PDF public] No request or pdf_file_url found for token', token);
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    const key = getPdfKeyFromUrl(request.pdf_file_url);
    console.log('[PDF public] Streaming PDF from R2', {
      bucket: R2_BUCKET_NAME,
      key,
    });

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const object = await r2Client.send(command);
    if (!object.Body) {
      console.error('[PDF public] R2 object has no Body', { key });
      return NextResponse.json({ error: 'Failed to load PDF' }, { status: 500 });
    }

    const body = await streamToBuffer(object.Body);
    console.log('[PDF public] Loaded PDF bytes', { key, size: body.length });

    // The underlying runtime accepts Node Buffers as response bodies, but the TypeScript
    // types for BodyInit are more strict (and don't include Buffer / Uint8Array here),
    // so we cast to any to satisfy the compiler while preserving the correct runtime behavior.
    return new NextResponse(body as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Error streaming public PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load PDF' },
      { status: 500 }
    );
  }
}


