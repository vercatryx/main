import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isSuperAdmin } from '@/lib/permissions';
import { updatePaymentRequestStatus } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superAdmin = await isSuperAdmin();
    if (!superAdmin) {
      return NextResponse.json({ error: 'Only super admins can update payment statuses' }, { status: 403 });
    }

    const body = await request.json();
    const { public_token, status } = body;

    if (!public_token || !status || !['completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid token or status' }, { status: 400 });
    }

    await updatePaymentRequestStatus(public_token, status);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
  }
}
