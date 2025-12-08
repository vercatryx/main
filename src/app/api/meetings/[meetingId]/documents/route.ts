import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { uploadMeetingDocument, deleteMeetingDocument, getMeeting } from '@/lib/meetings';
import { getUserByClerkId } from '@/lib/users';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await context.params;
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if user has access to the meeting
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Map Clerk user ID to database user ID
    const dbUser = await getUserByClerkId(userId);
    const dbUserId = dbUser?.id ?? null;
    const userCompanyId = dbUser?.company_id ?? null;

    // Check if user has access
    let hasAccess = false;

    if (dbUserId !== null) {
      // Host or explicitly invited user
      if (
        meeting.hostUserId === dbUserId ||
        meeting.participantUserIds.includes(dbUserId)
      ) {
        hasAccess = true;
      }

      // Company-wide meeting
      if (
        !hasAccess &&
        meeting.accessType === 'company' &&
        userCompanyId &&
        meeting.participantCompanyIds.includes(userCompanyId)
      ) {
        hasAccess = true;
      }
    }

    // Public meetings
    if (!hasAccess && meeting.accessType === 'public') {
      hasAccess = true;
    }

    // Superusers always have access
    if (!hasAccess) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };
      if (publicMetadata?.role === 'superuser') {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const document = await uploadMeetingDocument(meetingId, file, userId);

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await context.params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Check if user has access to the meeting
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Map Clerk user ID to database user ID
    const dbUser = await getUserByClerkId(userId);
    const dbUserId = dbUser?.id ?? null;

    // Check if user is host or the one who uploaded the document
    const document = meeting.documents?.find((doc: any) => doc.id === documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const isHost = dbUserId !== null && meeting.hostUserId === dbUserId;
    const isUploader = document.uploadedBy === userId;

    // Check if user is superuser
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };
    const isSuperuser = publicMetadata?.role === 'superuser';

    if (!isHost && !isUploader && !isSuperuser) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const success = await deleteMeetingDocument(meetingId, documentId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deletion failed' },
      { status: 500 }
    );
  }
}

