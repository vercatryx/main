import { auth, clerkClient } from "@clerk/nextjs/server";
import { getMeeting } from "@/lib/meetings";
import { redirect } from "next/navigation";
import JitsiMeetClient from "./page-client";

interface RouteParams {
  params: Promise<{ meetingId: string }>;
}

async function JoinMeetingPage({ params }: RouteParams) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { meetingId } = await params;
  const meeting = await getMeeting(meetingId);

  if (!meeting) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Meeting Not Found</h1>
          <p className="mt-4">The meeting you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Check if user has access to this meeting
  const hasAccess =
    meeting.hostUserId === userId ||
    meeting.participantUserIds.includes(userId);

  if (!hasAccess) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as { role?: 'superuser' | 'user' };

    if (publicMetadata?.role !== 'superuser') {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
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

  return (
    <JitsiMeetClient
      meeting={meeting}
      userId={userId}
      displayName={displayName}
    />
  );
}

export default function Page(props: RouteParams) {
  return (
    <main className="min-h-screen bg-black">
      <JoinMeetingPage {...props} />
    </main>
  );
}
