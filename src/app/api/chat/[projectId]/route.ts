import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, addMessage } from '@/lib/chat';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const messages = await getProjectMessages(projectId);

  // Since we are using local files, we don't need to refresh attachment URLs
  const messagesWithFreshUrls = messages;

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
