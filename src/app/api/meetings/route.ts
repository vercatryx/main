import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  createMeeting,
  getUserMeetings,
  getAllMeetingsList,
  generateJitsiRoomName,
  type Meeting,
} from '@/lib/meetings';
import { getUserByClerkId, getUserById, createUser } from '@/lib/users';
import { getAllCompanies } from '@/lib/companies';

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

  // Add participant names to meetings (we'll add this as metadata, not changing the Meeting type)
  return meetings.map(meeting => ({
    ...meeting,
    // Add participant names as a computed property (we'll handle this on the client)
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
    let meetings: Meeting[];
    if (publicMetadata?.role === 'superuser') {
      meetings = await getAllMeetingsList();
    } else {
      // Otherwise, return only the user's meetings
      meetings = await getUserMeetings(userId);
    }

    // Enrich with participant names
    const enrichedMeetings = await enrichMeetingsWithParticipantNames(meetings);
    
    return NextResponse.json({ meetings: enrichedMeetings });
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
    // Let database auto-generate UUID for meeting ID
    const tempJitsiRoomName = `vercatryx-temp-${Date.now()}`; // Temporary, will be updated

    // Convert Clerk user IDs to database UUIDs for participants
    const participantDatabaseIds: string[] = [];
    const missingUsers: string[] = [];
    if (Array.isArray(participantUserIds) && participantUserIds.length > 0) {
      for (const clerkId of participantUserIds) {
        const dbUser = await getUserByClerkId(clerkId);
        if (dbUser) {
          participantDatabaseIds.push(dbUser.id);
        } else {
          // Log missing users for debugging
          const clerkUser = await client.users.getUser(clerkId).catch(() => null);
          missingUsers.push(clerkUser?.emailAddresses[0]?.emailAddress || clerkId);
        }
      }
      
      // If access type is 'users' and we couldn't find any participants, that's an error
      if (accessType === 'users' && participantDatabaseIds.length === 0 && participantUserIds.length > 0) {
        return NextResponse.json(
          { 
            error: `Selected users not found in database: ${missingUsers.join(', ')}. Please ensure users are properly set up.` 
          },
          { status: 400 }
        );
      }
    }

    // Convert host Clerk ID to database UUID
    // For superusers, create a database record if it doesn't exist
    let hostDbUser = await getUserByClerkId(userId);
    if (!hostDbUser) {
      // Superuser doesn't exist in database - create them
      // Get the first company or create a default one
      const companies = await getAllCompanies();
      let companyId: string;
      
      if (companies.length > 0) {
        companyId = companies[0].id;
      } else {
        // No companies exist - this shouldn't happen, but handle it gracefully
        return NextResponse.json(
          { error: 'No companies found. Please create a company first.' },
          { status: 400 }
        );
      }

      // Get user email from Clerk
      const userEmail = user.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        return NextResponse.json(
          { error: 'User email not found. Please ensure your Clerk account has an email address.' },
          { status: 400 }
        );
      }

      // Create user record for superuser
      try {
        hostDbUser = await createUser({
          company_id: companyId,
          clerk_user_id: userId,
          email: userEmail,
          first_name: user.firstName,
          last_name: user.lastName,
          role: 'admin',
          status: 'active',
        });
      } catch (error) {
        console.error('Error creating superuser in database:', error);
        return NextResponse.json(
          { error: 'Failed to create user record. Please contact support.' },
          { status: 500 }
        );
      }
    }

    const meeting: Meeting = {
      id: '', // Will be generated by database
      title,
      description: description || '',
      hostUserId: hostDbUser.id, // Store database UUID instead of Clerk ID
      participantUserIds: participantDatabaseIds, // Store database UUIDs instead of Clerk IDs
      participantCompanyIds: Array.isArray(participantCompanyIds) ? participantCompanyIds : [],
      accessType: accessType || 'users',
      scheduledAt,
      duration,
      jitsiRoomName: tempJitsiRoomName,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Remove the id field so database can auto-generate it
    const { id, ...meetingWithoutId } = meeting;
    const createdMeeting = await createMeeting(meetingWithoutId as Meeting);

    // Update with proper Jitsi room name using the generated UUID
    const { updateMeeting } = await import('@/lib/meetings');
    const finalMeeting = await updateMeeting(createdMeeting.id, {
      jitsiRoomName: generateJitsiRoomName(createdMeeting.id),
    });

    return NextResponse.json({ meeting: finalMeeting || createdMeeting }, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
