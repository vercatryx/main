import { NextRequest, NextResponse } from 'next/server';
import { getAvailabilityRequest, updateAvailabilityStatus, hasRequestTimedOut } from '@/lib/kv';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Get request from database
    let requestData = await getAvailabilityRequest(id);

    if (!requestData) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Check if request is older than 3 minutes and still pending
    if (hasRequestTimedOut(requestData.createdAt) && requestData.status === 'pending') {
      requestData = await updateAvailabilityStatus(id, 'timeout');
    }

    return NextResponse.json({ status: requestData?.status || 'pending' });
  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
