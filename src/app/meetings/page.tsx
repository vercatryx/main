import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUpcomingMeetings } from "@/lib/meetings";
import MeetingsClient from "./page-client";

async function MeetingsPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
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

  const upcomingMeetings = await getUpcomingMeetings(userId);

  // Get user details for display
  const userInfo = {
    id: userId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses[0]?.emailAddress,
    isAdmin,
  };

  // If admin, fetch all users for meeting creation
  let users;
  if (isAdmin) {
    const { data: allUsers } = await client.users.getUserList();
    users = allUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      emailAddresses: u.emailAddresses.map((email) => ({
        emailAddress: email.emailAddress,
      })),
      publicMetadata: JSON.parse(JSON.stringify(u.publicMetadata)),
    }));
  }

  return <MeetingsClient userInfo={userInfo} initialMeetings={upcomingMeetings} users={users} />;
}

export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <MeetingsPage />
      </div>
    </main>
  );
}
