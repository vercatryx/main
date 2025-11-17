import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'availability-requests.json');

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status || (status !== 'available' && status !== 'unavailable')) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const content = await fs.readFile(DATA_FILE, 'utf-8');
    const requests = JSON.parse(content);

    if (!requests[id]) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    requests[id].status = status;
    requests[id].respondedAt = new Date().toISOString();

    await fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
