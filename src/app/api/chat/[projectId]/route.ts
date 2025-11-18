import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, addMessage } from '@/lib/chat';

type RouteParams = { params: { projectId: string } };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = params;
  const messages = await getProjectMessages(projectId);

  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = params;
  const { message, userId, userName } = await req.json();

  if (!message) {
    return new Response('Message is required', { status: 400 });
  }

  const newMessage = await addMessage(projectId, {
    userId: userId || 'anonymous',
    userName: userName || 'Anonymous',
    message,
  });

  return NextResponse.json(newMessage, { status: 201 });
}
