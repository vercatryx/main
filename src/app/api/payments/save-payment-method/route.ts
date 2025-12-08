import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPaymentRequestByToken, updatePaymentRequestStripeInfo } from '@/lib/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { public_token, payment_intent_id, setup_intent_id } = body;

    if (!public_token || (!payment_intent_id && !setup_intent_id)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get payment request
    const paymentRequest = await getPaymentRequestByToken(public_token);
    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    // Check if this is a recurring payment
    const isRecurring = paymentRequest.payment_type === 'monthly' || paymentRequest.payment_type === 'interval_billing';
    if (!isRecurring) {
      return NextResponse.json({ success: true, message: 'Not a recurring payment, skipping' });
    }

    let paymentMethodId: string;
    let customerId: string;

    if (setup_intent_id) {
      // Handle Setup Intent (for interval_billing - no charge)
      const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
      
      if (!setupIntent.payment_method) {
        return NextResponse.json({ error: 'No payment method found in setup intent' }, { status: 400 });
      }

      paymentMethodId = setupIntent.payment_method as string;
      customerId = setupIntent.customer as string;
    } else if (payment_intent_id) {
      // Handle Payment Intent (for monthly - with charge)
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      if (!paymentIntent.payment_method) {
        return NextResponse.json({ error: 'No payment method found in payment intent' }, { status: 400 });
      }

      paymentMethodId = paymentIntent.payment_method as string;
      customerId = paymentIntent.customer as string;
    } else {
      return NextResponse.json({ error: 'Either payment_intent_id or setup_intent_id is required' }, { status: 400 });
    }

    // If no customer, create one
    if (!customerId && paymentRequest.recipient_email) {
      const customer = await stripe.customers.create({
        email: paymentRequest.recipient_email,
      });
      customerId = customer.id;
    }

    // Attach payment method to customer if not already attached
    if (customerId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (err: any) {
        // Payment method might already be attached, that's okay
        if (!err.message?.includes('already been attached')) {
          console.error('Error attaching payment method:', err);
        }
      }
    }

    // Update payment request with Stripe info
    await updatePaymentRequestStripeInfo(
      paymentRequest.id,
      customerId || undefined,
      paymentMethodId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving payment method:', error);
    return NextResponse.json(
      { error: 'Failed to save payment method' },
      { status: 500 }
    );
  }
}

