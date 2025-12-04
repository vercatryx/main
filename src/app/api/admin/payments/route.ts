import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/permissions';
import { createPaymentRequest, getAllPaymentRequests, getCompanyPaymentRequests } from '@/lib/payments';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    console.log('API GET /admin/payments - userId:', userId); // Debug log
    if (!userId) {
      console.log('No userId, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    console.log('Clerk user metadata:', clerkUser?.publicMetadata); // Debug
    const isSuperAdmin = clerkUser?.publicMetadata?.role === 'superuser';
    console.log('Is super admin:', isSuperAdmin); // Debug

    const dbUser = await getCurrentUser();
    console.log('DB user:', dbUser ? { id: dbUser.id, role: dbUser.role, company_id: dbUser.company_id } : 'null'); // Debug

    let requests;
    if (isSuperAdmin) {
      console.log('Super admin access - fetching all');
      requests = await getAllPaymentRequests();
    } else if (dbUser && dbUser.company_id && dbUser.role === 'admin') {
      console.log('Company admin access - fetching company requests');
      requests = await getCompanyPaymentRequests(dbUser.company_id);
    } else {
      console.log('Access denied - not super or company admin');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    return NextResponse.json({ error: 'Failed to fetch payment requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    console.log('API POST /admin/payments - userId:', userId); // Debug log
    if (!userId) {
      console.log('No userId, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    console.log('Clerk user metadata:', clerkUser?.publicMetadata); // Debug
    const isSuperAdmin = clerkUser?.publicMetadata?.role === 'superuser';
    console.log('Is super admin:', isSuperAdmin); // Debug

    const dbUser = await getCurrentUser();
    console.log('DB user:', dbUser ? { id: dbUser.id, role: dbUser.role, company_id: dbUser.company_id } : 'null'); // Debug

    if (!isSuperAdmin && !(dbUser && dbUser.role === 'admin')) {
      console.log('Access denied - not super or company admin');
      return NextResponse.json({ error: 'Only admins can create payment requests' }, { status: 403 });
    }

    console.log('Access granted, processing POST'); // Debug

    const body = await request.json();
    console.log('POST body:', body); // Debug
    const { userId: targetUserId, recipientEmail, recipientName, amount } = body;

    if (!recipientEmail || !recipientName || !amount || typeof amount !== 'number' || amount <= 0) {
      console.log('Invalid input:', { recipientEmail, recipientName, amount });
      return NextResponse.json({ error: 'Invalid recipient email, name, or amount' }, { status: 400 });
    }

    const requestData = await createPaymentRequest({
      userId: targetUserId || undefined,
      recipientEmail,
      recipientName,
      amount,
      createdByClerkUserId: userId,
    });

    console.log('Payment request created:', requestData); // Debug

    return NextResponse.json({ request: requestData }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment request:', error);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}
