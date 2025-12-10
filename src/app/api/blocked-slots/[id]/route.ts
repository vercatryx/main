import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { unblockTimeSlot } from '@/lib/meeting-scheduling';
import { requireCompanyAdmin, isSuperAdmin } from '@/lib/permissions';

// DELETE - Remove a blocked time slot (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const success = await unblockTimeSlot(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to unblock time slot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking time slot:', error);
    return NextResponse.json(
      { error: 'Failed to unblock time slot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

