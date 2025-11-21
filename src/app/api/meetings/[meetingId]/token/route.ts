import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMeeting } from '@/lib/meetings';
import { generateJaasToken, isJaasConfigured } from '@/lib/jaas';
import { getUserByClerkId } from '@/lib/users';

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

// GET /api/meetings/[meetingId]/token - Get JaaS JWT token for a meeting
export async function GET(request: Request, context: RouteContext) {
  try {
    // Check if JaaS is configured
    if (!isJaasConfigured()) {
      return NextResponse.json(
        {
          error: 'JaaS not configured',
          message:
            'Please configure JaaS credentials (JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_PRIVATE_KEY) in your environment variables.',
        },
        { status: 500 }
      );
    }

    const { meetingId } = await context.params;
    const meeting = await getMeeting(meetingId);

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Get current auth state (may be null for public meetings)
    const { userId } = await auth();

    // Public meetings: allow guests without sign-in by issuing a guest token
    if (!userId && meeting.accessType === 'public') {
      const guestId = `guest-${meeting.id}-${Date.now()}`;
      const userName = 'Guest';

      const token = generateJaasToken({
        roomName: meeting.jitsiRoomName,
        userId: guestId,
        userName,
        userEmail: undefined,
        userAvatar: undefined,
        isModerator: false,
        expiresInMinutes: 180,
      });

      return NextResponse.json({
        token,
        domain: '8x8.vc',
        roomName: meeting.jitsiRoomName,
      });
    }

    // Non-public meetings still require sign-in
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Map Clerk user ID to database user ID used in meetings table
    const dbUser = await getUserByClerkId(userId);
    const dbUserId = dbUser?.id ?? null;
    const userCompanyId = dbUser?.company_id ?? null;

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
      const publicMetadata = user.publicMetadata as {
        role?: 'superuser' | 'user';
      };

      if (publicMetadata?.role !== 'superuser') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get user info
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.emailAddresses[0]?.emailAddress || 'Guest';

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const userAvatar = user.imageUrl;

    // Check if user is the host
    const isModerator = meeting.hostUserId === userId;

    // Generate JWT token
    const token = generateJaasToken({
      roomName: meeting.jitsiRoomName,
      userId,
      userName,
      userEmail,
      userAvatar,
      isModerator,
      expiresInMinutes: 180, // 3 hours (matching the meeting access window)
    });

    return NextResponse.json({
      token,
      domain: '8x8.vc',
      roomName: meeting.jitsiRoomName,
    });
  } catch (error) {
    console.error('Error generating JaaS token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
