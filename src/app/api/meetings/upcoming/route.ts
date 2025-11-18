import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUpcomingMeetings } from '@/lib/meetings';

// GET /api/meetings/upcoming - Get upcoming meetings for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetings = await getUpcomingMeetings(userId);
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Error fetching upcoming meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming meetings' },
      { status: 500 }
    );
  }
}
