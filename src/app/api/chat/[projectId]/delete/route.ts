import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectMessages, deleteChatFile } from '@/lib/chat';
import { getServerSupabaseClient } from '@/lib/supabase';

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

    // Get all messages to find all attachments
    const messages = await getProjectMessages(projectId);

    // Delete all attachments from R2
    const deletionPromises: Promise<void>[] = [];
    for (const message of messages) {
      if (message.attachments && Array.isArray(message.attachments)) {
        for (const attachment of message.attachments) {
          if (attachment.url) {
            deletionPromises.push(
              deleteChatFile(attachment.url).catch(error => {
                console.error('Error deleting attachment from R2:', error);
                // Don't throw - continue deleting other files
              })
            );
          }
        }
      }
    }

    // Wait for all file deletions to complete (or fail gracefully)
    await Promise.all(deletionPromises);
    console.log(`Deleted ${deletionPromises.length} attachments from R2`);

    // Delete all messages from the database
    const supabase = getServerSupabaseClient();
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting messages from database:', error);
      return NextResponse.json(
        { error: 'Failed to delete messages from database' },
        { status: 500 }
      );
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
