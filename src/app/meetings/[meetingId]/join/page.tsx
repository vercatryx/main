import { auth, clerkClient } from "@clerk/nextjs/server";
import { getMeeting } from "@/lib/meetings";
import { redirect } from "next/navigation";
import JitsiMeetClient from "./page-client";
import { getUserByClerkId } from "@/lib/users";

interface RouteParams {
  params: Promise<{ meetingId: string }>;
}

async function JoinMeetingPage({ params }: RouteParams) {
  const { meetingId } = await params;
  const meeting = await getMeeting(meetingId);

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Meeting Not Found</h1>
          <p className="mt-4">The meeting you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Get current auth state (may be null for public meetings)
  const { userId } = await auth();

  // Public meetings: allow guests without sign-in
  if (!userId && meeting.accessType === 'public') {
    return (
      <JitsiMeetClient
        meeting={meeting}
        // For guests, we don't have a real user ID; it's only used client-side
        userId="guest"
        displayName="Guest"
        isSuperuser={false}
      />
    );
  }

  // Non-public meetings still require sign-in
  if (!userId) {
    redirect('/sign-in');
  }

  // Map Clerk user ID to database user ID (used in meetings table)
  const dbUser = await getUserByClerkId(userId);

  // Check if user has access to this meeting
  // Note:
  // - meeting.hostUserId and participantUserIds store database user IDs
  // - meeting.participantCompanyIds stores company IDs for company-wide meetings
  // - accessType can be: 'users' | 'company' | 'public'
  const dbUserId = dbUser?.id ?? null;
  const userCompanyId = dbUser?.company_id ?? null;

  let hasAccess = false;

  if (dbUserId !== null) {
    // Host or explicitly invited user
    if (
      meeting.hostUserId === dbUserId ||
      meeting.participantUserIds.includes(dbUserId)
    ) {
      hasAccess = true;
    }

    // Company-wide meeting: any user whose company is in participantCompanyIds
    if (
      !hasAccess &&
      meeting.accessType === 'company' &&
      userCompanyId &&
      meeting.participantCompanyIds.includes(userCompanyId)
    ) {
      hasAccess = true;
    }
  }

  // Public meetings: any authenticated user may join
  if (!hasAccess && meeting.accessType === 'public') {
    hasAccess = true;
  }

  if (!hasAccess) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };

    if (publicMetadata?.role !== 'superuser') {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold">Access Denied</h1>
            <p className="mt-4">You don't have permission to join this meeting.</p>
          </div>
        </div>
      );
    }
  }

  // Get user info for display name
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.emailAddresses[0]?.emailAddress || 'Guest';
  const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };
  const isSuperuser = publicMetadata?.role === 'superuser';

  return (
    <JitsiMeetClient
      meeting={meeting}
      userId={userId}
      displayName={displayName}
      isSuperuser={isSuperuser}
    />
  );
}

export default function Page(props: RouteParams) {
  return (
    <main className="min-h-screen bg-background">
      <JoinMeetingPage {...props} />
    </main>
  );
}
