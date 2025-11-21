import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  getMeeting,
  updateMeeting,
  deleteMeeting,
  updateMeetingStatus,
} from '@/lib/meetings';
import { getUserByClerkId, getUsersByClerkIds } from '@/lib/users';

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

// GET /api/meetings/[meetingId] - Get a specific meeting
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Map Clerk user ID to database user ID used in meetings table
    const dbUser = await getUserByClerkId(userId);
    const dbUserId = dbUser?.id ?? null;
    const userCompanyId = dbUser?.company_id ?? null;

    const { meetingId } = await context.params;
    const meeting = await getMeeting(meetingId);

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user has access to this meeting
    // Note:
    // - meeting.hostUserId and participantUserIds store database user IDs
    // - meeting.participantCompanyIds stores company IDs for company-wide meetings
    // - accessType can be: 'users' | 'company' | 'public'
    let hasAccess = false;

    if (dbUserId !== null) {
      if (
        meeting.hostUserId === dbUserId ||
        meeting.participantUserIds.includes(dbUserId)
      ) {
        hasAccess = true;
      }

      if (
        !hasAccess &&
        meeting.accessType === 'company' &&
        userCompanyId &&
        meeting.participantCompanyIds.includes(userCompanyId)
      ) {
        hasAccess = true;
      }
    }

    if (!hasAccess && meeting.accessType === 'public') {
      hasAccess = true;
    }

    if (!hasAccess) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };

      if (publicMetadata?.role !== 'superuser') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PATCH /api/meetings/[meetingId] - Update a meeting
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await context.params;
    const meeting = await getMeeting(meetingId);

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Only host or superuser can update meeting
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };

    if (meeting.hostUserId !== userId && publicMetadata?.role !== 'superuser') {
      return NextResponse.json(
        { error: 'Only the host or admin can update this meeting' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, participantUserIds, ...otherUpdates } = body;

    // Convert Clerk user IDs to database UUIDs if participantUserIds is provided
    let participantDatabaseIds: string[] | undefined;
    if (participantUserIds !== undefined) {
      participantDatabaseIds = [];
      if (Array.isArray(participantUserIds) && participantUserIds.length > 0) {
        const dbUsers = await getUsersByClerkIds(participantUserIds);
        dbUsers.forEach(user => participantDatabaseIds!.push(user.id));
      }
    }

    // Prepare updates object
    const updates: any = { ...otherUpdates };
    if (participantDatabaseIds !== undefined) {
      updates.participantUserIds = participantDatabaseIds;
    }

    let updatedMeeting;

    // Handle status updates separately
    if (status) {
      const additionalData: { startedAt?: string; endedAt?: string } = {};

      if (status === 'in-progress' && !meeting.startedAt) {
        additionalData.startedAt = new Date().toISOString();
      }

      if (status === 'completed' && !meeting.endedAt) {
        additionalData.endedAt = new Date().toISOString();
      }

      updatedMeeting = await updateMeetingStatus(meetingId, status, additionalData);
    } else {
      updatedMeeting = await updateMeeting(meetingId, updates);
    }

    if (!updatedMeeting) {
      return NextResponse.json(
        { error: 'Failed to update meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json({ meeting: updatedMeeting });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings/[meetingId] - Delete a meeting
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await context.params;
    const meeting = await getMeeting(meetingId);

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Only host or superuser can delete meeting
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };

    if (meeting.hostUserId !== userId && publicMetadata?.role !== 'superuser') {
      return NextResponse.json(
        { error: 'Only the host or admin can delete this meeting' },
        { status: 403 }
      );
    }

    const deleted = await deleteMeeting(meetingId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}
