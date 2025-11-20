import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUpcomingMeetings, getAllMeetingsList, type Meeting } from '@/lib/meetings';
import { getUserById } from '@/lib/users';

// Helper function to enrich meetings with participant names
async function enrichMeetingsWithParticipantNames(meetings: Meeting[]): Promise<Meeting[]> {
  // Collect all unique user IDs
  const userIds = new Set<string>();
  meetings.forEach(meeting => {
    userIds.add(meeting.hostUserId);
    meeting.participantUserIds.forEach(id => userIds.add(id));
  });

  // Fetch all users at once
  const usersMap = new Map<string, { firstName: string | null; lastName: string | null; email: string }>();
  for (const userId of userIds) {
    const user = await getUserById(userId);
    if (user) {
      usersMap.set(userId, {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      });
    }
  }

  // Add participant names to meetings
  return meetings.map(meeting => ({
    ...meeting,
    _participantNames: [
      meeting.hostUserId,
      ...meeting.participantUserIds
    ].map(id => {
      const user = usersMap.get(id);
      if (user) {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return name || user.email;
      }
      return null;
    }).filter(Boolean) as string[],
  }));
}

// GET /api/meetings/upcoming - Get upcoming meetings for the authenticated user
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
    let meetings: Meeting[];
    if (publicMetadata?.role === 'superuser') {
      meetings = await getAllMeetingsList();
    } else {
      // Otherwise, return only the user's upcoming meetings
      meetings = await getUpcomingMeetings(userId);
    }

    // Enrich with participant names
    const enrichedMeetings = await enrichMeetingsWithParticipantNames(meetings);
    
    return NextResponse.json({ meetings: enrichedMeetings });
  } catch (error) {
    console.error('Error fetching upcoming meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming meetings' },
      { status: 500 }
    );
  }
}
