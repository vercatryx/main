import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserByClerkId } from '@/lib/users';

/**
 * Manual user sync endpoint
 * Used when the webhook fails and user reaches the "Account Not Set Up" page
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the request is from an authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { clerkUserId, email } = body;

    // Verify the user is requesting sync for themselves
    if (userId !== clerkUserId) {
      return NextResponse.json(
        { error: 'Cannot sync other users' },
        { status: 403 }
      );
    }

    // Check if user now exists in database
    const dbUser = await getUserByClerkId(userId);

    if (dbUser) {
      return NextResponse.json({
        success: true,
        message: 'User found in database',
        user: dbUser
      });
    }

    // User still not in database
    return NextResponse.json(
      {
        success: false,
        message: 'User not found in database. Please contact your administrator.'
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    );
  }
}
