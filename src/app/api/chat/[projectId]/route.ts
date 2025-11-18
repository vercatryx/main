import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, addMessage } from '@/lib/chat';
import { head } from '@vercel/blob';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const messages = await getProjectMessages(projectId);

  // Refresh attachment URLs to prevent 403 errors
  const messagesWithFreshUrls = await Promise.all(
    messages.map(async (msg) => {
      if (msg.attachments && msg.attachments.length > 0) {
        const freshAttachments = await Promise.all(
          msg.attachments.map(async (att) => {
            try {
              // Get fresh download URL that won't expire quickly
              const blobInfo = await head(att.url);
              return {
                ...att,
                url: blobInfo.downloadUrl,
              };
            } catch (error) {
              console.error('Error refreshing attachment URL:', error);
              return att; // Return original if refresh fails
            }
          })
        );
        return { ...msg, attachments: freshAttachments };
      }
      return msg;
    })
  );

  return NextResponse.json(messagesWithFreshUrls, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const { message, userId, userName, attachments } = await req.json();

  // Allow empty message if there are attachments
  const hasMessage = message && message.trim();
  const hasAttachments = attachments && attachments.length > 0;

  if (!hasMessage && !hasAttachments) {
    return new Response('Message or attachments required', { status: 400 });
  }

  const newMessage = await addMessage(projectId, {
    userId: userId || 'anonymous',
    userName: userName || 'Anonymous',
    message: message || '',
    ...(hasAttachments && { attachments }),
  });

  return NextResponse.json(newMessage, { status: 201 });
}
