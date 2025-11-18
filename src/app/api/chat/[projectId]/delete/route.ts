import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { promises as fs } from 'fs';
import path from 'path';

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

    // Delete the chat messages JSON file
    const chatFilePath = path.join(process.cwd(), 'data', 'chat', `${projectId}.json`);
    try {
      await fs.unlink(chatFilePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') { // Ignore if file doesn't exist
        console.error('Error deleting chat JSON file:', error);
      }
    }

    // Delete the chat files directory
    const chatFilesDirPath = path.join(process.cwd(), 'public', 'chat-files', projectId);
    try {
      await fs.rm(chatFilesDirPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Error deleting chat files directory:', error);
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
