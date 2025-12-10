import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllBlockedTimeSlots, blockTimeSlot } from '@/lib/meeting-scheduling';
import { requireCompanyAdmin, isSuperAdmin } from '@/lib/permissions';
import { getUserByClerkId } from '@/lib/users';

// GET - Get blocked time slots (admin only)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const superAdmin = await isSuperAdmin();
    const companyAdmin = await requireCompanyAdmin().catch(() => null);

    if (!superAdmin && !companyAdmin) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const blockedSlots = await getAllBlockedTimeSlots(startDate, endDate);

    return NextResponse.json({ blockedSlots });
  } catch (error) {
    console.error('Error getting blocked slots:', error);
    return NextResponse.json(
      { error: 'Failed to get blocked slots', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a blocked time slot (admin only)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const superAdmin = await isSuperAdmin();
    const companyAdmin = await requireCompanyAdmin().catch(() => null);

    if (!superAdmin && !companyAdmin) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { startTime, endTime, reason } = body;

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'startTime must be before endTime' },
        { status: 400 }
      );
    }

    // Get user's database UUID
    const dbUser = await getUserByClerkId(userId);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const blockedSlot = await blockTimeSlot(startTime, endTime, reason, dbUser.id);

    return NextResponse.json({ blockedSlot }, { status: 201 });
  } catch (error) {
    console.error('Error blocking time slot:', error);
    return NextResponse.json(
      { error: 'Failed to block time slot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

