import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, updateProjectMessages } from '@/lib/chat';
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
    // For now, we'll allow any authenticated user
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await context.params;
    const { messageId, attachmentUrl } = await req.json();

    if (!messageId || !attachmentUrl) {
      return NextResponse.json(
        { error: 'Message ID and attachment URL required' },
        { status: 400 }
      );
    }

    console.log('Deleting attachment:', { messageId, attachmentUrl });

    // Delete from local file system
    try {
      // Extract the file path from the URL (e.g., /chat-files/projectId/messageId/filename.ext)
      const relativeFilePath = attachmentUrl.split('/chat-files/')[1];
      const absoluteFilePath = path.join(process.cwd(), 'public', 'chat-files', relativeFilePath);
      await fs.unlink(absoluteFilePath);
      console.log('File deleted successfully from local storage');
    } catch (fileError: any) {
      if (fileError.code !== 'ENOENT') { // Ignore if file doesn't exist
        console.error('Local file deletion error:', fileError);
      }
    }

    // Get messages and remove the attachment from the message
    const messages = await getProjectMessages(projectId);
    console.log('Current messages count:', messages.length);

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId && msg.attachments) {
        console.log('Found message with attachments:', msg.attachments.length);
        const deletedAttachment = msg.attachments.find(att => att.url === attachmentUrl);
        const remainingAttachments = msg.attachments.filter(att => att.url !== attachmentUrl);
        console.log('Remaining attachments:', remainingAttachments.length);

        // If no attachments left and no message text, add deletion notice
        if (remainingAttachments.length === 0 && (!msg.message || !msg.message.trim())) {
          console.log('No attachments left, adding deletion message');
          return {
            ...msg,
            message: deletedAttachment ? `"${deletedAttachment.filename}" was deleted` : 'Attachment was deleted',
            attachments: undefined
          };
        }

        console.log('Keeping message with remaining attachments');
        return {
          ...msg,
          attachments: remainingAttachments.length > 0 ? remainingAttachments : undefined
        };
      }
      return msg;
    });

    // Save updated messages
    await updateProjectMessages(projectId, updatedMessages);

    // No need for setTimeout for local file system
    // await new Promise(resolve => setTimeout(resolve, 400));

    console.log('Attachment deleted successfully, updated messages saved');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
