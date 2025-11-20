import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserMeetings, getAllMeetingsList, type Meeting } from "@/lib/meetings";
import { getAllCompanies } from "@/lib/companies";
import { getUserById, getUsersByClerkIds } from "@/lib/users";
import MeetingsClient from "./page-client";

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

async function MeetingsPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Access Denied</h1>
          <p className="mt-4">You must be logged in to view this page.</p>
        </div>
      </div>
    );
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };
  const isAdmin = publicMetadata?.role === 'superuser';

  // Get all meetings (we'll separate into upcoming/past on the client)
  let allMeetings = isAdmin 
    ? await getAllMeetingsList()
    : await getUserMeetings(userId);

  // Enrich meetings with participant names
  allMeetings = await enrichMeetingsWithParticipantNames(allMeetings);

  // Get user details for display
  const userInfo = {
    id: userId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses[0]?.emailAddress,
    isAdmin,
  };

  // If admin, fetch all users and companies for meeting creation
  let users;
  let companies;
  if (isAdmin) {
    const { data: allUsers } = await client.users.getUserList();
    
    // Get Clerk IDs to fetch database user info (if available)
    const clerkIds = allUsers.map(u => u.id);
    const dbUsers = await getUsersByClerkIds(clerkIds);
    
    // Create a map of Clerk ID to database user for quick lookup
    const dbUsersMap = new Map(dbUsers.map(u => [u.clerk_user_id, u]));
    
    // Merge Clerk user data with database user data (prioritize database names)
    // Always show all Clerk users, but use database names when available
    users = allUsers.map((u) => {
      const dbUser = dbUsersMap.get(u.id);
      return {
        id: u.id,
        firstName: dbUser?.first_name || u.firstName || null,
        lastName: dbUser?.last_name || u.lastName || null,
        emailAddresses: u.emailAddresses.map((email) => ({
          emailAddress: email.emailAddress,
        })),
        publicMetadata: JSON.parse(JSON.stringify(u.publicMetadata)),
      };
    });
    companies = await getAllCompanies();
  }

  return <MeetingsClient userInfo={userInfo} initialMeetings={allMeetings} users={users} companies={companies} />;
}

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <MeetingsPage />
      </div>
    </main>
  );
}
