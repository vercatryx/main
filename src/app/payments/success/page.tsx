'use client';

import { useState, useEffect, Suspense } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updatePaymentRequestStatus } from '@/lib/payments';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentIntent {
  id: string;
  amount: number;
  status: string;
  metadata: {
    originalAmount: string;
    fee: string;
    public_token?: string;
    method?: string;
    payer_email?: string;
  };
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdated, setStatusUpdated] = useState(false);
  const [isACH, setIsACH] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  const clientSecret = searchParams.get('client_secret');
  const publicTokenParam = searchParams.get('public_token');
  const isSetupIntentParam = searchParams.get('setup_intent') === 'true';
  // Detect SetupIntent by client secret prefix (seti_xxx) vs PaymentIntent (pi_xxx)
  const isSetupIntent = isSetupIntentParam || (clientSecret?.startsWith('seti_') ?? false);

  useEffect(() => {
    stripePromise.then((stripeInstance) => {
      if (stripeInstance) {
        setStripe(stripeInstance);
      }
    });
  }, []);

  useEffect(() => {
    if (clientSecret && stripe) {
      if (isSetupIntent) {
        // Handle Setup Intent (for interval_billing - no charge)
        stripe.retrieveSetupIntent(clientSecret).then(({ setupIntent }) => {
          if (setupIntent) {
            const metadata = (setupIntent as any).metadata || {};
            // Try to get public_token from metadata, URL param, or setup intent metadata
            const publicToken = metadata.public_token || publicTokenParam;
            
            if (setupIntent.status === 'succeeded') {
              toast.success('Payment method saved successfully!');
              
              // Save payment method for interval_billing
              if (publicToken && setupIntent.payment_method) {
                console.log('Saving payment method with:', { publicToken, setup_intent_id: setupIntent.id, payment_method: setupIntent.payment_method });
                fetch('/api/payments/save-payment-method', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    public_token: publicToken,
                    setup_intent_id: setupIntent.id,
                  }),
                }).then(async (response) => {
                  if (!response.ok) {
                    const error = await response.json();
                    console.error('Failed to save payment method:', error);
                    toast.error('Failed to save payment method. Please contact support.');
                  } else {
                    setStatusUpdated(true);
                    console.log('Payment method saved successfully');
                    // Status will be updated to 'invoiced' by the save-payment-method API
                  }
                }).catch((err) => {
                  console.error('Failed to save payment method:', err);
                  toast.error('Failed to save payment method. Please contact support.');
                });
              } else {
                console.error('Missing publicToken or payment_method:', { 
                  publicToken, 
                  publicTokenParam,
                  metadata,
                  payment_method: setupIntent.payment_method 
                });
                toast.error('Missing payment information. Please contact support.');
              }
              
              // Set a dummy payment intent for display
              setPaymentIntent({
                id: setupIntent.id,
                amount: 0,
                status: 'succeeded',
                metadata: {
                  originalAmount: '0',
                  fee: '0',
                  public_token: publicToken,
                  method: metadata.method || 'card',
                  payer_email: metadata.payer_email || '',
                },
              });
            } else {
              setError('Setup not confirmed as successful.');
              router.push('/payments');
            }
          } else {
            setError('Setup not confirmed as successful.');
            router.push('/payments');
          }
        }).catch((err) => {
          console.error('Error retrieving setup intent:', err);
          setError('Failed to verify setup.');
          router.push('/payments');
        });
      } else {
        // Handle Payment Intent (regular payments)
        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
          if (paymentIntent) {
            const metadata = (paymentIntent as any).metadata || {};
            const pi: PaymentIntent = {
              id: paymentIntent.id,
              amount: paymentIntent.amount,
              status: paymentIntent.status,
              metadata: {
                originalAmount: metadata.originalAmount || '0',
                fee: metadata.fee || '0',
                public_token: metadata.public_token,
                method: metadata.method,
                payer_email: metadata.payer_email,
              },
            };
            const achMethod = pi.metadata.method === 'ach';
            if (pi.status === 'succeeded' || (achMethod && pi.status === 'processing')) {
              setPaymentIntent(pi);
              setIsACH(achMethod);
              if (achMethod && pi.metadata.payer_email) {
                setEmail(pi.metadata.payer_email);
              }

              // If public_token in metadata, update status and save payment method for recurring payments
              if (pi.metadata.public_token) {
                updatePaymentRequestStatus(pi.metadata.public_token, 'completed')
                  .then((invoiceNumber) => {
                    setStatusUpdated(true);
                    toast.success('Payment recorded successfully!');
                    
                    // Send receipt email automatically
                    const originalAmount = parseFloat(pi.metadata.originalAmount || '0');
                    const fee = parseFloat(pi.metadata.fee || '0');
                    const total = paymentIntent.amount / 100;
                    
                    fetch('/api/payments/send-receipt', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        public_token: pi.metadata.public_token,
                        paymentIntentId: paymentIntent.id,
                        amount: originalAmount,
                        fee: fee,
                        total: total,
                        paymentMethod: pi.metadata.method || 'card',
                        recipientEmail: pi.metadata.payer_email || '',
                        invoiceNumber: invoiceNumber,
                      }),
                    }).catch((err) => {
                      console.error('Failed to send receipt:', err);
                      // Don't show error to user, just log it
                    });
                    
                    // Save payment method for recurring payments
                    const paymentMethodId = (paymentIntent as any).payment_method;
                    if (paymentMethodId) {
                      fetch('/api/payments/save-payment-method', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          public_token: pi.metadata.public_token,
                          payment_intent_id: paymentIntent.id,
                        }),
                      }).catch((err) => {
                        console.error('Failed to save payment method:', err);
                        // Don't show error to user, just log it
                      });
                    }
                  })
                  .catch((err) => {
                    console.error('Failed to update payment status:', err);
                    toast.error('Payment completed, but recording failed. Contact support.');
                  });
              }
            } else {
              setError('Payment not confirmed as successful.');
              router.push('/payments');
            }
          } else {
            setError('Payment not confirmed as successful.');
            router.push('/payments');
          }
        }).catch((err) => {
          console.error('Error retrieving payment intent:', err);
          // If error indicates it's a SetupIntent secret, try retrieving as SetupIntent
          if (err.message && err.message.includes('SetupIntent')) {
            stripe.retrieveSetupIntent(clientSecret).then(({ setupIntent }) => {
              if (setupIntent) {
                const metadata = (setupIntent as any).metadata || {};
                const publicToken = metadata.public_token;
                
                if (setupIntent.status === 'succeeded') {
                  toast.success('Payment method saved successfully!');
                  
                  // Save payment method for interval_billing
                  if (publicToken && setupIntent.payment_method) {
                    fetch('/api/payments/save-payment-method', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        public_token: publicToken,
                        setup_intent_id: setupIntent.id,
                      }),
                    }).then(() => {
                      setStatusUpdated(true);
                      // Mark as completed since setup is done
                      updatePaymentRequestStatus(publicToken, 'completed').catch((err) => {
                        console.error('Failed to update payment status:', err);
                      });
                    }).catch((err) => {
                      console.error('Failed to save payment method:', err);
                    });
                  }
                  
                  // Set a dummy payment intent for display
                  setPaymentIntent({
                    id: setupIntent.id,
                    amount: 0,
                    status: 'succeeded',
                    metadata: {
                      originalAmount: '0',
                      fee: '0',
                      public_token: publicToken,
                      method: metadata.method || 'card',
                      payer_email: metadata.payer_email || '',
                    },
                  });
                } else {
                  setError('Setup not confirmed as successful.');
                  router.push('/payments');
                }
              } else {
                setError('Setup not confirmed as successful.');
                router.push('/payments');
              }
            }).catch((setupErr) => {
              console.error('Error retrieving setup intent:', setupErr);
              setError('Failed to verify setup.');
              router.push('/payments');
            });
          } else {
            setError('Failed to verify payment.');
            router.push('/payments');
          }
        });
      }
    } else if (clientSecret && !stripe) {
      // Wait for Stripe to load
      return;
    } else {
      setError('No payment information found.');
      router.push('/payments');
    }
  }, [clientSecret, stripe, router, isSetupIntent]);

  if (!paymentIntent) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Verifying Payment...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const originalAmount = parseFloat(paymentIntent.metadata.originalAmount);
  const fee = parseFloat(paymentIntent.metadata.fee || '0');
  const total = paymentIntent.amount / 100;
  const payerEmail = paymentIntent.metadata.payer_email;
  const isSetupOnly = total === 0 && isSetupIntent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let submitEmail = email;
    if (isACH && payerEmail && !submitEmail) {
      submitEmail = payerEmail;
    }
    if (!name || !submitEmail) {
      setError('Please provide your name and email.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/payments/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: submitEmail,
          originalAmount,
          fee,
          total,
          paymentIntentId: paymentIntent.id,
        }),
      });

      if (response.ok) {
        toast.success('Invoice sent to your email!');
        setShowForm(false);
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to send invoice.');
      }
    } catch (err) {
      setError('An error occurred while sending the invoice.');
    }

    setIsSubmitting(false);
  };

  const successMessage = isSetupOnly
    ? 'Your payment method has been saved successfully! You\'ll be billed as needed in the future.'
    : isACH 
    ? 'Your ACH payment has been initiated and will be processed within 2-3 business days.' 
    : 'Thank you for your payment.';

  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <img src="/logo-big.svg" alt="Vercatryx Logo" className="mx-auto h-12 w-auto mb-4" />
          <CardTitle>{isSetupOnly ? 'Payment Method Saved!' : 'Payment Successful!'}</CardTitle>
          <CardDescription>
            {successMessage} {!isSetupOnly && `Total charged: $${total.toFixed(2)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSetupOnly ? (
            <div className="text-center">
              <p className="text-green-600 mb-4">Your payment method has been securely saved. No charge was made.</p>
              <p className="text-sm text-muted-foreground mb-4">
                You'll receive email notifications when you're billed in the future.
              </p>
              <Button onClick={() => router.push('/')} className="mt-4">
                Back to Home
              </Button>
            </div>
          ) : showForm ? (
            <>
              <p>To send you an invoice, please provide your details:</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required={!(isACH && payerEmail)}
                    disabled={!!(isACH && payerEmail)}
                  />
                  {isACH && payerEmail && <p className="text-xs text-muted-foreground">Email prefilled from payment.</p>}
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Sending...' : 'Send Invoice'}
                </Button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </form>
            </>
          ) : (
            <div className="text-center">
              <p className="text-green-600">Invoice sent successfully!</p>
              <Button onClick={() => router.push('/')} className="mt-4">
                Back to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">Please wait...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
