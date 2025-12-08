import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/permissions';
import { getPaymentRequestById, getRequestDisplayInfo } from '@/lib/payments';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const isSuperAdmin = clerkUser?.publicMetadata?.role === 'superuser';
    const dbUser = await getCurrentUser();

    if (!isSuperAdmin && !(dbUser && dbUser.role === 'admin')) {
      return NextResponse.json({ error: 'Only admins can bill payments' }, { status: 403 });
    }

    const body = await request.json();
    const { id, amount } = body;

    if (!id || !amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment request ID or amount' }, { status: 400 });
    }

    // Get payment request
    const paymentRequest = await getPaymentRequestById(id);
    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    // Check if this is an interval billing or monthly payment
    if (paymentRequest.payment_type !== 'interval_billing' && paymentRequest.payment_type !== 'monthly') {
      return NextResponse.json({ error: 'This payment type does not support manual billing' }, { status: 400 });
    }

    // Check if payment method is saved
    if (!paymentRequest.stripe_customer_id || !paymentRequest.stripe_payment_method_id) {
      return NextResponse.json({ 
        error: 'Payment method not saved. Customer must complete initial payment first.' 
      }, { status: 400 });
    }

    // Calculate fee (3% for card, 0% for ACH)
    // We need to check the payment method type
    let paymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentRequest.stripe_payment_method_id);
    } catch (err) {
      return NextResponse.json({ error: 'Failed to retrieve payment method' }, { status: 500 });
    }

    const isCard = paymentMethod.type === 'card';
    const fee = isCard ? amount * 0.03 : 0;
    const totalAmount = amount + fee;
    const totalCents = Math.round(totalAmount * 100);

    // Create payment intent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      customer: paymentRequest.stripe_customer_id,
      payment_method: paymentRequest.stripe_payment_method_id,
      off_session: true, // This is an off-session payment (no customer present)
      confirm: true, // Automatically confirm the payment
      metadata: {
        originalAmount: amount.toString(),
        fee: fee.toString(),
        public_token: paymentRequest.public_token,
        method: isCard ? 'card' : 'ach',
        billed_by: userId,
        billing_type: paymentRequest.payment_type,
      },
    });

    if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
      // Send receipt email automatically (in background, don't wait)
      const sendReceipt = async () => {
        try {
          const { email: recipientEmail, name: recipientName } = getRequestDisplayInfo(paymentRequest);
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          
          await fetch(`${baseUrl}/api/payments/send-receipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              public_token: paymentRequest.public_token,
              paymentIntentId: paymentIntent.id,
              amount: amount,
              fee: fee,
              total: totalAmount,
              paymentMethod: isCard ? 'card' : 'ach',
              recipientEmail: recipientEmail,
              recipientName: recipientName,
            }),
          });
        } catch (receiptError) {
          console.error('Error sending receipt email:', receiptError);
          // Don't fail the billing operation if receipt fails
        }
      };
      
      // Send receipt asynchronously (don't await)
      sendReceipt();

      return NextResponse.json({ 
        success: true, 
        message: `Payment of $${totalAmount.toFixed(2)} (${amount.toFixed(2)} + ${fee.toFixed(2)} fee) has been ${paymentIntent.status === 'succeeded' ? 'charged' : 'initiated'}. Receipt sent to customer.`,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Payment failed with status: ${paymentIntent.status}` 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error billing payment:', error);
    
    // Handle Stripe errors
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ 
        success: false,
        error: error.message || 'Payment failed. The card may have been declined or the payment method may need to be updated.' 
      }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to bill payment', details: error.message },
      { status: 500 }
    );
  }
}

