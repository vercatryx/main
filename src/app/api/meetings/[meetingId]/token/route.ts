import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMeeting } from '@/lib/meetings';
import { generateJaasToken, isJaasConfigured } from '@/lib/jaas';

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

// GET /api/meetings/[meetingId]/token - Get JaaS JWT token for a meeting
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check if user has access to this meeting
    const hasAccess =
      meeting.hostUserId === userId ||
      meeting.participantUserIds.includes(userId);

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
