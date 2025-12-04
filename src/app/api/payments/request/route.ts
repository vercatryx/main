import { NextRequest, NextResponse } from 'next/server';
import { getPaymentRequestByToken } from '@/lib/payments';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const paymentRequest = await getPaymentRequestByToken(token);

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: paymentRequest });
  } catch (error) {
    console.error('Error fetching payment request:', error);
    return NextResponse.json({ error: 'Failed to fetch payment request' }, { status: 500 });
  }
}
