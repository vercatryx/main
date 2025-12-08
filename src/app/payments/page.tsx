'use client';

import { useState, useEffect, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getRequestDisplayInfo } from '@/lib/payments';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ total, clientSecret, public_token, paymentRequest, isSetupIntent = false }: { 
  total: number; 
  clientSecret: string; 
  public_token?: string;
  paymentRequest?: any;
  isSetupIntent?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!stripe || !elements) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading secure payment form...</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-12 bg-muted rounded-md animate-pulse"></div>
          <div className="h-10 bg-muted rounded-md animate-pulse w-3/4"></div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsLoading(true);
    setError('');

    const returnUrl = `${window.location.origin}/payments/success?client_secret=${clientSecret}${public_token ? `&public_token=${public_token}` : ''}${isSetupIntent ? '&setup_intent=true' : ''}`;

    if (isSetupIntent) {
      // For setup intents (interval_billing), just confirm setup without charging
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Setup failed');
      }
    } else {
      // For payment intents, confirm payment
      const isRecurring = paymentRequest && 
        (paymentRequest.payment_type === 'monthly' || paymentRequest.payment_type === 'interval_billing');
      
      const confirmParams: any = {
        return_url: returnUrl,
      };

      if (isRecurring) {
        // Save payment method for future use
        confirmParams.setup_future_usage = 'off_session';
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams,
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
      }
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isLoading}>
        {isLoading ? 'Processing...' : isSetupIntent ? 'Save Payment Method' : `Pay $${total.toFixed(2)}`}
      </Button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [total, setTotal] = useState(0);
  const [fee, setFee] = useState(0);
  const [showAmountForm, setShowAmountForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [public_token, setPublicToken] = useState(searchParams.get('public_token') || '');
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [loadingRequest, setLoadingRequest] = useState(!!public_token);
  const [payerEmail, setPayerEmail] = useState('');

  // If public_token, fetch request
  useEffect(() => {
    if (public_token) {
      const fetchRequest = async () => {
        try {
          setLoadingRequest(true);
          const response = await fetch(`/api/payments/request?token=${public_token}`);

          if (!response.ok) {
            if (response.status === 404) {
              setError('Invalid payment request token.');
            } else {
              setError('Failed to load payment request.');
            }
            setLoadingRequest(false);
            return;
          }

          const { request } = await response.json();
          if (request) {
            // For interval_billing, don't set amount (we'll use $1.00 to save payment method)
            if (request.payment_type !== 'interval_billing') {
              setAmount(request.amount.toString());
              setInvoiceAmount(request.amount.toString());
            } else {
              // Set a placeholder amount for interval_billing (will use $1.00 for setup)
              setAmount('1.00');
            }
            setPaymentRequest(request);
            // Prefill invoice info
            const { name, email } = getRequestDisplayInfo(request);
            setInvoiceName(name);
            setInvoiceEmail(email);
            setPayerEmail(email);
          } else {
            setError('Invalid payment request token.');
          }
        } catch (err) {
          console.error('Error fetching payment request:', err);
          setError('Failed to load payment request.');
        } finally {
          setLoadingRequest(false);
        }
      };
      fetchRequest();
    }
  }, [public_token]);

  useEffect(() => {
    if (!public_token) {
      const paramAmountStr = searchParams.get('amount') || '';
      if (paramAmountStr) {
        setAmount(paramAmountStr);
        setInvoiceAmount(paramAmountStr);
      }
    }
  }, [searchParams, public_token]);

  async function proceedToPayment(numAmount: number, method: string) {
    const isCC = method === 'cc';
    const isIntervalBilling = paymentRequest?.payment_type === 'interval_billing';
    
    setSelectedMethod(method);
    setError('');

    // For interval_billing, use setup intent (no charge)
    if (isIntervalBilling) {
      setShowPreview(true);
      setFee(0);
      setTotal(0);
      try {
        let body: any = { 
          method: method === 'ach' ? 'us_bank_account' : 'card',
          public_token: public_token,
        };
        if (method === 'ach') {
          let emailToSend = public_token ? getRequestDisplayInfo(paymentRequest).email : payerEmail;
          if (!emailToSend) {
            throw new Error('Email required for ACH');
          }
          body.email = emailToSend;
        }
        const response = await fetch('/api/payments/create-setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error('Failed to create setup intent');
        }
        const { clientSecret: secret } = await response.json();
        if (secret) {
          setClientSecret(secret);
          toast.success('Ready to save your payment method');
        } else {
          throw new Error('No client secret received');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        toast.error(message);
        setShowPreview(false);
      }
      return;
    }
    
    // For regular payments, use payment intent
    const calculatedFee = isCC ? numAmount * 0.03 : 0;
    const calculatedTotal = numAmount + calculatedFee;
    setFee(calculatedFee);
    setTotal(calculatedTotal);
    setShowPreview(true);
    setError('');
    
    try {
      let body: any = { 
        amount: numAmount, 
        method: method === 'ach' ? 'us_bank_account' : 'card' 
      };
      if (public_token) {
        body.public_token = public_token;
      }
      if (method === 'ach') {
        let emailToSend = public_token ? getRequestDisplayInfo(paymentRequest).email : payerEmail;
        if (!emailToSend) {
          throw new Error('Email required for ACH');
        }
        body.email = emailToSend;
      }
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      const { clientSecret: secret } = await response.json();
      if (secret) {
        setClientSecret(secret);
        const feeText = isCC ? ' (includes 3% fee)' : ' (no processing fee)';
        toast.success(`Total to pay: $${calculatedTotal.toFixed(2)}${feeText}`);
      } else {
        throw new Error('No client secret received');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
      setShowPreview(false);
      setShowAmountForm(true);
      // Ensure amount is set to preset
      const fallbackAmount = public_token ? (paymentRequest?.amount || 0) : parseFloat(searchParams.get('amount') || '0');
      if (fallbackAmount > 0) {
        setAmount(fallbackAmount.toString());
      }
    }
  }

  if (loadingRequest) {
    return <div className="container mx-auto py-8">Loading payment request...</div>;
  }

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    setError('');

    // For interval_billing, skip amount entry and use minimal amount to save payment method
    const isIntervalBilling = paymentRequest?.payment_type === 'interval_billing';
    const isMonthly = paymentRequest?.payment_type === 'monthly';
    const isRecurring = isIntervalBilling || isMonthly;

    if (isRecurring && (method === 'cc' || method === 'ach')) {
      // For recurring payments, use $1.00 to save payment method (minimal charge)
      proceedToPayment(1.00, method);
      return;
    }

    const presetAmount = public_token ? (paymentRequest?.amount || 0) : parseFloat(searchParams.get('amount') || '0');
    const hasPreset = presetAmount > 0;

    if (method === 'cc') {
      if (hasPreset) {
        proceedToPayment(presetAmount, method);
      } else {
        setShowAmountForm(true);
      }
    } else if (method === 'ach') {
      if (hasPreset && (public_token || payerEmail)) {
        proceedToPayment(presetAmount, method);
      } else {
        setShowAmountForm(true);
      }
    } else {
      // For non-cc, prefill invoice if ?amount=
      if (!public_token && searchParams.get('amount')) {
        setInvoiceAmount(searchParams.get('amount') || '');
      }
      setShowDialog(true);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setError('');
  };

  const handleAmountSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (selectedMethod === 'ach') {
      let emailToSend = public_token ? getRequestDisplayInfo(paymentRequest).email : payerEmail;
      if (!emailToSend) {
        setError('Please provide your email address for ACH');
        return;
      }
    }

    const isCC = selectedMethod === 'cc';
    const calculatedFee = isCC ? numAmount * 0.03 : 0;
    const calculatedTotal = numAmount + calculatedFee;
    setFee(calculatedFee);
    setTotal(calculatedTotal);
    setShowPreview(true);
    setError('');

    // Automatically create payment intent
    try {
      let body: any = { 
        amount: numAmount, 
        method: selectedMethod === 'ach' ? 'us_bank_account' : 'card' 
      };
      if (public_token) {
        body.public_token = public_token;
      }
      if (selectedMethod === 'ach') {
        const emailToSend = public_token ? getRequestDisplayInfo(paymentRequest).email : payerEmail;
        body.email = emailToSend;
      }
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret: secret } = await response.json();

      if (secret) {
        setClientSecret(secret);
        const feeText = isCC ? ' (includes 3% fee)' : ' (no processing fee)';
        toast.success(`Total to pay: $${calculatedTotal.toFixed(2)}${feeText}`);
      } else {
        throw new Error('No client secret received');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
      // Optionally reset to amount form on error
      setShowPreview(false);
    }
  };

  const handleEditAmount = () => {
    setShowPreview(false);
    setShowPaymentForm(false);
    setClientSecret('');
    setAmount(public_token ? (paymentRequest?.amount || 0).toString() : '');
    const { name, email } = public_token && paymentRequest ? getRequestDisplayInfo(paymentRequest) : { name: '', email: '' };
    setInvoiceName(name);
    setInvoiceEmail(email);
    setPayerEmail(email);
    setInvoiceAmount(public_token ? (paymentRequest?.amount || 0).toString() : '');
    setShowAmountForm(true);
    setSelectedMethod('');
    setShowDialog(false);
    setInvoiceSuccess(false);
    setInvoiceError('');
    setError('');
  };

  const handleBackToSelection = () => {
    setShowAmountForm(false);
    setShowPreview(false);
    setShowPaymentForm(false);
    setSelectedMethod('');
    setClientSecret('');
    setError('');
    setAmount(public_token ? (paymentRequest?.amount || 0).toString() : '');
    const { name, email } = public_token && paymentRequest ? getRequestDisplayInfo(paymentRequest) : { name: '', email: '' };
    setInvoiceName(name);
    setInvoiceEmail(email);
    setPayerEmail(email);
    setInvoiceAmount(public_token ? (paymentRequest?.amount || 0).toString() : '');
  };

  const handleBackToAmount = () => {
    setShowPreview(false);
    setShowPaymentForm(false);
    setClientSecret('');
    setShowAmountForm(true);
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceName || !invoiceEmail || !invoiceAmount) {
      setInvoiceError('Please provide your name, email, and amount.');
      return;
    }

    const numAmount = parseFloat(invoiceAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setInvoiceError('Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmittingInvoice(true);
    setInvoiceError('');

    try {
      const body: {
        name: string;
        email: string;
        originalAmount: number;
        fee: number;
        total: number;
        paymentIntentId: string;
        public_token?: string;
      } = {
        name: invoiceName,
        email: invoiceEmail,
        originalAmount: numAmount,
        fee: 0, // No fee for invoice methods
        total: numAmount,
        paymentIntentId: `DUMMY-${Date.now()}-${selectedMethod}`,
        ...(public_token && { public_token }),
      };
      const response = await fetch('/api/payments/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const { error } = await response.json();
        setInvoiceError(error || 'Failed to send invoice.');
      } else {
        setInvoiceSuccess(true);
        setInvoiceError('');
        toast.success('Invoice sent to your email!');
        setInvoiceName('');
        setInvoiceEmail('');
        setInvoiceAmount('');
      }
    } catch (err) {
      setInvoiceError('An error occurred while sending the invoice.');
    }

    setIsSubmittingInvoice(false);
  };

  const presetAmount = public_token ? (paymentRequest?.amount || 0) : parseFloat(searchParams.get('amount') || '0');
  const hasPreset = presetAmount > 0;
  const isCCorACH = selectedMethod === 'cc' || selectedMethod === 'ach';
  const numAmount = parseFloat(amount) || 0;

  if (showPreview && isCCorACH) {
    const methodTitle = selectedMethod === 'cc' ? 'Credit Card' : 'ACH Bank Transfer';
    const feeText = selectedMethod === 'cc' ? ' (includes 3% credit card processing fee—avoidable with ACH, Wire, or Zelle)' : ' (no processing fee)';
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="flex items-center mb-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={hasPreset ? handleBackToSelection : handleBackToAmount}
            className="mr-4"
          >
            ← Back
          </Button>
        </div>
        <Card>
          <CardHeader className="text-center">
            <img src="/logo-big.svg" alt="Vercatryx Logo" className="mx-auto h-16 w-auto mb-4" />
            <CardTitle>{methodTitle} Payment</CardTitle>
            <CardDescription>
              {paymentRequest?.payment_type === 'interval_billing' 
                ? "Setting up your payment method. No charge will be made - we'll just save your payment details for future billing." 
                : `Review your payment details. Total: ${total.toFixed(2)}${feeText}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {paymentRequest && (paymentRequest.payment_type === 'monthly' || paymentRequest.payment_type === 'interval_billing') && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  {paymentRequest.payment_type === 'interval_billing' ? 'Interval Billing Setup' : 'Monthly Recurring Payment Setup'}
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {paymentRequest.payment_type === 'interval_billing' ? (
                    <>
                      You're setting up your payment method for interval billing. No charge will be made now - we'll just save your payment details. 
                      After setup, you'll be billed as needed. You only need to enter your payment details once.
                    </>
                  ) : (
                    <>
                      Your payment method will be saved and you'll be billed as needed. You only need to 
                      enter your payment details once. Only card and ACH payment methods are available.
                    </>
                  )}
                </p>
              </div>
            )}
            {paymentRequest?.payment_type !== 'interval_billing' && (
              <div className="space-y-2">
                <h4 className="font-semibold">Payment Breakdown</h4>
                <div className="border rounded-md p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Service Amount:</span>
                    <span>${numAmount.toFixed(2)}</span>
                  </div>
                  {fee > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Processing Fee (3%):</span>
                        <span>${fee.toFixed(2)}</span>
                      </div>
                      <hr />
                    </>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>Total Due:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            {paymentRequest?.payment_type === 'interval_billing' && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>No charge will be made.</strong> We're just saving your payment method securely. 
                  You'll only be charged when you're billed in the future.
                </p>
              </div>
            )}

            {clientSecret && (
              <div className="pt-4">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm 
                    total={total} 
                    clientSecret={clientSecret} 
                    public_token={public_token}
                    paymentRequest={paymentRequest}
                    isSetupIntent={paymentRequest?.payment_type === 'interval_billing'}
                  />
                </Elements>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={hasPreset ? handleBackToSelection : handleBackToAmount}
              >
                {hasPreset ? 'Change Method' : 'Edit Amount'}
              </Button>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showAmountForm) {
    const isCC = selectedMethod === 'cc';
    const isACH = selectedMethod === 'ach';
    const methodDesc = isCC 
      ? 'Enter the amount you wish to pay. A 3% credit card processing fee will be added (this fee can be avoided by choosing ACH, Wire Transfer, or Zelle).' 
      : isACH 
      ? 'Enter the amount and your email for ACH bank transfer. No processing fee.' 
      : 'Enter the amount for your payment.';
    return (
      <div className="container mx-auto py-8 max-w-md">
        <div className="flex items-center mb-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToSelection}
            className="mr-4"
          >
            ← Back
          </Button>
        </div>
        <Card>
          <CardHeader className="text-center">
            <img src="/logo-big.svg" alt="Vercatryx Logo" className="mx-auto h-12 w-auto mb-4" />
            <CardTitle>{isCC ? 'Credit Card' : isACH ? 'ACH Bank Transfer' : selectedMethod.toUpperCase()} Payment</CardTitle>
            <CardDescription>
              {hasPreset 
                ? `Payment request for $${presetAmount.toFixed(2)}.` 
                : methodDesc
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAmountSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Amount ($)
                </label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                  required
                  disabled={hasPreset}
                />
                {hasPreset && <p className="text-sm text-muted-foreground mt-1">Amount preset by request.</p>}
              </div>
              {isACH && (
                <div className="space-y-1">
                  <label htmlFor="payerEmail" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <Input
                    id="payerEmail"
                    type="email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="Enter your email"
                    required={!public_token}
                  />
                  <p className="text-xs text-muted-foreground">Required for ACH bank transfer verification.</p>
                </div>
              )}
              <Button type="submit" className="w-full">
                {isCC || isACH ? 'Continue to Payment' : 'Continue'}
              </Button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </form>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleBackToSelection} 
              className="w-full mt-2"
            >
              Change Method
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dialog for Wire/Zelle
  return (
    <>
      <div className="container mx-auto py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <img src="/logo-big.svg" alt="Vercatryx Logo" className="mx-auto h-12 w-auto mb-4" />
            <CardTitle>Make a Payment</CardTitle>
            <CardDescription>
              Select your preferred payment method. Note: Credit card payments include a 3% processing fee, which can be avoided with ACH, Wire Transfer, or Zelle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${paymentRequest && (paymentRequest.payment_type === 'monthly' || paymentRequest.payment_type === 'interval_billing') ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
              {(!paymentRequest || (paymentRequest.payment_type !== 'monthly' && paymentRequest.payment_type !== 'interval_billing')) && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => handleMethodSelect('zelle')}
                  >
                    <span className="mb-1">💰</span>
                    Zelle
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => handleMethodSelect('wire')}
                  >
                    <span className="mb-1">🏦</span>
                    Wire Transfer
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => handleMethodSelect('ach')}
              >
                <span className="mb-1">🏛️</span>
                ACH Transfer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => handleMethodSelect('cc')}
              >
                <span className="mb-1">💳</span>
                Credit Card
              </Button>
            </div>
            {paymentRequest && (paymentRequest.payment_type === 'monthly' || paymentRequest.payment_type === 'interval_billing') && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Only card and ACH payment methods are available for recurring payments.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedMethod.toUpperCase()} Payment Instructions</DialogTitle>
            <DialogDescription>
              Follow these steps to complete your payment. These methods are handled off-site.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedMethod === 'wire' && (
              <div className="space-y-2">
                <h4 className="font-semibold">Wire Transfer Details</h4>
                {public_token && paymentRequest?.amount ? (
                  <p className="text-sm">Please initiate a wire transfer for ${paymentRequest.amount}.</p>
                ) : (
                  <p className="text-sm">Please initiate a wire transfer. Contact us to confirm the amount and receive exact details.</p>
                )}
                <div className="border rounded-md p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Bank Name:</span><span>JPMorgan Chase Bank, N.A.</span></div>
                  <div className="flex justify-between"><span>Account Number:</span><span>307234937</span></div>
                  <div className="flex justify-between"><span>Wire Routing Number:</span><span>021000021</span></div>
                  <div className="flex justify-between"><span>Account Name:</span><span>David Heimowitz</span></div>
                </div>
              </div>
            )}
            {selectedMethod === 'zelle' && (
              <div className="space-y-2">
                <h4 className="font-semibold">Zelle Payment Details</h4>
                {public_token && paymentRequest?.amount ? (
                  <p className="text-sm">Send ${paymentRequest.amount} via Zelle.</p>
                ) : (
                  <p className="text-sm">Send payment via Zelle. Contact us to confirm the amount.</p>
                )}
                <div className="border rounded-md p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Phone:</span><span>(347) 215-0400</span></div>
                </div>
              </div>
            )}

            {/* Invoice Request Form in Dialog */}
            <div className="border-t pt-4">
              <h5 className="font-semibold mb-3">Request Invoice</h5>
              <p className="text-xs mb-3">Provide details including the payment amount to receive an invoice:</p>
              <form onSubmit={handleInvoiceSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="invoiceName" className="text-xs font-medium block">
                    Full Name
                  </label>
                  <Input
                    id="invoiceName"
                    value={invoiceName}
                    onChange={(e) => setInvoiceName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="invoiceEmail" className="text-xs font-medium block">
                    Email Address
                  </label>
                  <Input
                    id="invoiceEmail"
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="invoiceAmount" className="text-xs font-medium block">
                    Amount ($)
                  </label>
                  <Input
                    id="invoiceAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                    disabled={public_token && paymentRequest || !!searchParams.get('amount')}
                  />
                  { (public_token && paymentRequest) || !!searchParams.get('amount') ? (
                    <p className="text-xs text-muted-foreground">Amount preset by request.</p>
                  ) : null }
                </div>
                <Button type="submit" size="sm" disabled={isSubmittingInvoice} className="w-full">
                  {isSubmittingInvoice ? 'Sending...' : 'Send Invoice Request'}
                </Button>
                {invoiceError && <p className="text-red-500 text-xs">{invoiceError}</p>}
                {invoiceSuccess && <p className="text-green-600 text-xs">Sent successfully! Check your email.</p>}
              </form>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PaymentsPage() {
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
      <PaymentsPageContent />
    </Suspense>
  );
}
