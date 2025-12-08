import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/permissions';
import { getPaymentRequestById } from '@/lib/payments';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// GET - Get all billing history for a payment request
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const isSuperAdmin = clerkUser?.publicMetadata?.role === 'superuser';
    const dbUser = await getCurrentUser();

    if (!isSuperAdmin && !(dbUser && dbUser.role === 'admin')) {
      return NextResponse.json({ error: 'Only admins can view billing history' }, { status: 403 });
    }

    const { id } = await context.params;
    const paymentRequest = await getPaymentRequestById(id);

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    if (!paymentRequest.stripe_customer_id) {
      return NextResponse.json({ billings: [] });
    }

    // Get all payment intents for this customer that match this payment request
    const paymentIntents = await stripe.paymentIntents.list({
      customer: paymentRequest.stripe_customer_id,
      limit: 100, // Get up to 100 most recent
    });

    // Filter to only payment intents that match this payment request (by public_token in metadata)
    const matchingBillings = paymentIntents.data
      .filter((pi) => 
        pi.status === 'succeeded' && 
        pi.metadata?.public_token === paymentRequest.public_token
      )
      .map((pi) => {
        const originalAmount = parseFloat(pi.metadata?.originalAmount || '0');
        const fee = parseFloat(pi.metadata?.fee || '0');
        const total = pi.amount / 100;
        const method = pi.metadata?.method || 'card';

        return {
          paymentIntentId: pi.id,
          amount: originalAmount || total,
          fee: fee,
          total: total,
          paymentMethod: method,
          date: new Date(pi.created * 1000).toISOString(),
          invoiceNumber: pi.metadata?.invoice_number ? parseInt(pi.metadata.invoice_number) : null,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

    return NextResponse.json({ billings: matchingBillings });
  } catch (error: any) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing history', details: error.message },
      { status: 500 }
    );
  }
}

