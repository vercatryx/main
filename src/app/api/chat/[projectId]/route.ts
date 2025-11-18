import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, addMessage } from '@/lib/chat';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { projectId } = params;
  const messages = await getProjectMessages(projectId);

  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { userId, sessionClaims } = auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { projectId } = params;
  const { message } = await req.json();

  if (!message) {
    return new Response('Message is required', { status: 400 });
  }

  const newMessage = await addMessage(projectId, {
    userId,
    userName: sessionClaims?.metadata?.userName as string || 'Anonymous',
    message,
  });

  return NextResponse.json(newMessage, { status: 201 });
}

