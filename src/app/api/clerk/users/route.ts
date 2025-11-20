import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getUsersByClerkIds } from '@/lib/users';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the requesting user to check if they're a superuser
    const clerk = await clerkClient();
    const requestingUser = await clerk.users.getUser(userId);
    const publicMetadata = requestingUser.publicMetadata as { role?: 'superuser' | 'user' };

    // Only superusers can list all users
    if (publicMetadata?.role !== 'superuser') {
      return NextResponse.json(
        { error: 'Only superusers can list users' },
        { status: 403 }
      );
    }

    // Fetch all Clerk users
    const allUsers = await clerk.users.getUserList({
      limit: 500, // Adjust as needed
    });

    // Get Clerk IDs to fetch database user info
    const clerkIds = allUsers.data.map(u => u.id);
    const dbUsers = await getUsersByClerkIds(clerkIds);
    
    // Create a map of Clerk ID to database user for quick lookup
    const dbUsersMap = new Map(dbUsers.map(u => [u.clerk_user_id, u]));

    // Format users for the modal - merge Clerk data with database data (prioritize database names)
    const users = allUsers.data.map(user => {
      const dbUser = dbUsersMap.get(user.id);
      return {
        id: user.id,
        firstName: dbUser?.first_name || user.firstName || null,
        lastName: dbUser?.last_name || user.lastName || null,
        emailAddresses: user.emailAddresses,
        publicMetadata: user.publicMetadata,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching Clerk users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
