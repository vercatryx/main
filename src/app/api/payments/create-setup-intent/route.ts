import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPaymentRequestByToken, getRequestDisplayInfo } from '@/lib/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { public_token, method = 'card', email } = await request.json();

    if (!public_token) {
      return NextResponse.json({ error: 'Public token is required' }, { status: 400 });
    }

    // Get payment request
    const paymentRequest = await getPaymentRequestByToken(public_token);
    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    // Only allow setup intents for interval_billing
    if (paymentRequest.payment_type !== 'interval_billing') {
      return NextResponse.json({ error: 'Setup intents are only for interval billing' }, { status: 400 });
    }

    let customerEmail = email;
    if (!customerEmail) {
      customerEmail = paymentRequest.recipient_email || getRequestDisplayInfo(paymentRequest).email;
    }

    if (!customerEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const isACH = method === 'us_bank_account';

    // Create or get customer
    let customerId = paymentRequest.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: customerEmail });
      customerId = customer.id;
    }

    // Create setup intent (no charge, just collects payment method)
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: isACH ? ['us_bank_account'] : ['card'],
      metadata: {
        public_token: public_token,
        method: isACH ? 'ach' : 'card',
        payer_email: customerEmail,
      },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 });
  }
}

