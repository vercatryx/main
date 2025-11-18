import { NextRequest, NextResponse } from 'next/server';
import { del, list } from '@vercel/blob';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();

    // Check if user is admin (you'll need to implement your admin check logic)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await context.params;

    // Delete all chat files for this project
    const { blobs } = await list({ prefix: `chat-files/${projectId}/` });

    for (const blob of blobs) {
      await del(blob.url);
    }

    // Delete the chat messages JSON file
    const chatFile = `chat-${projectId}.json`;
    const { blobs: chatBlobs } = await list({ prefix: chatFile });

    for (const blob of chatBlobs) {
      await del(blob.url);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
