import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, updateProjectMessages, deleteChatFile } from '@/lib/chat';
import { auth } from '@clerk/nextjs/server';

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

    // Delete from R2 storage
    try {
      await deleteChatFile(attachmentUrl);
    } catch (fileError: any) {
      console.error('R2 file deletion error:', fileError);
      // Continue even if file deletion fails - we still want to remove it from the message
    }

    // Get messages and remove the attachment from the message
    const messages = await getProjectMessages(projectId);

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId && msg.attachments) {
        const deletedAttachment = msg.attachments.find(att => att.url === attachmentUrl);
        const remainingAttachments = msg.attachments.filter(att => att.url !== attachmentUrl);

        // If no attachments left and no message text, add deletion notice
        if (remainingAttachments.length === 0 && (!msg.message || !msg.message.trim())) {
          return {
            ...msg,
            message: deletedAttachment ? `"${deletedAttachment.filename}" was deleted` : 'Attachment was deleted',
            attachments: undefined
          };
        }
        return {
          ...msg,
          attachments: remainingAttachments.length > 0 ? remainingAttachments : undefined
        };
      }
      return msg;
    });

    // Save updated messages
    await updateProjectMessages(projectId, updatedMessages);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
