import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPaymentRequestByToken, getRequestDisplayInfo } from '@/lib/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { amount, public_token, method = 'card', email } = await request.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    let customerEmail = email;
    if (public_token && !customerEmail) {
      try {
        const paymentRequest = await getPaymentRequestByToken(public_token);
        if (paymentRequest) {
          customerEmail = paymentRequest.recipient_email || getRequestDisplayInfo(paymentRequest).email;
        }
      } catch (err) {
        console.error('Error fetching payment request:', err);
      }
    }

    const isACH = method === 'us_bank_account';
    if (isACH && !customerEmail) {
      return NextResponse.json({ error: 'Email is required for ACH payments' }, { status: 400 });
    }

    const fee = isACH ? 0 : amount * 0.03;
    const totalAmount = amount + fee;
    const totalCents = Math.round(totalAmount * 100);

    const metadata: any = {
      originalAmount: amount.toString(),
      public_token: public_token || '',
    };
    if (!isACH) {
      metadata.fee = fee.toString();
    } else {
      metadata.payer_email = customerEmail;
      metadata.method = 'ach';
    }

    // Check if this is a recurring payment
    let paymentRequest = null;
    if (public_token) {
      try {
        paymentRequest = await getPaymentRequestByToken(public_token);
      } catch (err) {
        console.error('Error fetching payment request:', err);
      }
    }

    const isRecurring = paymentRequest && 
      (paymentRequest.payment_type === 'monthly' || paymentRequest.payment_type === 'interval_billing');

    let paymentIntent;
    if (isACH) {
      // For recurring ACH, use existing customer or create new one
      let customerId = paymentRequest?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: customerEmail });
        customerId = customer.id;
      }
      
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        customer: customerId,
        payment_method_types: ['us_bank_account'],
        metadata,
        setup_future_usage: isRecurring ? 'off_session' : undefined,
      });
    } else {
      // For recurring card payments, use existing customer or create new one
      let customerId = paymentRequest?.stripe_customer_id;
      if (isRecurring && !customerId && customerEmail) {
        const customer = await stripe.customers.create({ email: customerEmail });
        customerId = customer.id;
      }

      paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        customer: customerId || undefined,
        metadata,
        setup_future_usage: isRecurring ? 'off_session' : undefined,
      });
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
