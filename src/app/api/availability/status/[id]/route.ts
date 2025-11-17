import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'availability-requests.json');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const content = await fs.readFile(DATA_FILE, 'utf-8');
    const requests = JSON.parse(content);
    const requestData = requests[id];

    if (!requestData) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Check if request is older than 3 minutes and still pending
    const createdAt = new Date(requestData.createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

    if (diffMinutes > 3 && requestData.status === 'pending') {
      requestData.status = 'timeout';
      requests[id] = requestData;
      await fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2));
    }

    return NextResponse.json({ status: requestData.status });
  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
