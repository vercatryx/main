import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  createMeeting,
  getUserMeetings,
  getAllMeetingsList,
  generateJitsiRoomName,
  type Meeting,
} from '@/lib/meetings';

// GET /api/meetings - Get meetings for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };

    // If user is a superuser, return all meetings
    if (publicMetadata?.role === 'superuser') {
      const meetings = await getAllMeetingsList();
      return NextResponse.json({ meetings });
    }

    // Otherwise, return only the user's meetings
    const meetings = await getUserMeetings(userId);
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Create a new meeting (admin only)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };

    // Only superusers can create meetings
    if (publicMetadata?.role !== 'superuser') {
      return NextResponse.json(
        { error: 'Only superusers can create meetings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      participantUserIds,
      participantCompanyIds,
      accessType,
      scheduledAt,
      duration,
    } = body;

    // Validate required fields
    if (!title || !scheduledAt || !duration || !accessType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate access type specific requirements
    if (accessType === 'users' && (!participantUserIds || participantUserIds.length === 0)) {
      return NextResponse.json(
        { error: 'At least one user must be selected for user-specific meetings' },
        { status: 400 }
      );
    }

    if (accessType === 'company' && (!participantCompanyIds || participantCompanyIds.length === 0)) {
      return NextResponse.json(
        { error: 'At least one company must be selected for company-wide meetings' },
        { status: 400 }
      );
    }

    // Generate unique meeting ID
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const jitsiRoomName = generateJitsiRoomName(meetingId);

    const meeting: Meeting = {
      id: meetingId,
      title,
      description: description || '',
      hostUserId: userId,
      participantUserIds: Array.isArray(participantUserIds) ? participantUserIds : [],
      participantCompanyIds: Array.isArray(participantCompanyIds) ? participantCompanyIds : [],
      accessType: accessType || 'users',
      scheduledAt,
      duration,
      jitsiRoomName,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdMeeting = await createMeeting(meeting);

    return NextResponse.json({ meeting: createdMeeting }, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
