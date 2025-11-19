import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

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

    // Format users for the modal
    const users = allUsers.data.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddresses: user.emailAddresses,
      publicMetadata: user.publicMetadata,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching Clerk users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
