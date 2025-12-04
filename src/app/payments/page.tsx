'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ total, clientSecret }: { total: number; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments/success?client_secret=${clientSecret}`,
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
    } // Success redirects to return_url

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isLoading}>
        {isLoading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
      </Button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}

export default function PaymentsPage() {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amount, setAmount] = useState('');
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

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    if (method === 'cc') {
      setShowAmountForm(true);
    } else {
      setShowDialog(true);
    }
    setError('');
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

    const calculatedFee = numAmount * 0.03;
    const calculatedTotal = numAmount + calculatedFee;
    setFee(calculatedFee);
    setTotal(calculatedTotal);
    setShowPreview(true);
    setError('');

    // Automatically create payment intent
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret: secret } = await response.json();

      if (secret) {
        setClientSecret(secret);
        setShowPaymentForm(true);
        toast.success(`Total to pay: $${calculatedTotal.toFixed(2)} (includes 3% fee)`);
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
    setAmount('');
    setShowAmountForm(true);
    setSelectedMethod('');
    setShowDialog(false);
    setInvoiceName('');
    setInvoiceEmail('');
    setInvoiceAmount('');
    setInvoiceSuccess(false);
    setInvoiceError('');
    setError('');
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
      const response = await fetch('/api/payments/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: invoiceName,
          email: invoiceEmail,
          originalAmount: numAmount,
          fee: 0,
          total: numAmount,
          paymentIntentId: `DUMMY-${Date.now()}-${selectedMethod}`,
        }),
      });

      if (response.ok) {
        setInvoiceSuccess(true);
        setInvoiceError('');
        toast.success('Proforma invoice sent to your email!');
        setInvoiceName('');
        setInvoiceEmail('');
        setInvoiceAmount('');
      } else {
        const { error } = await response.json();
        setInvoiceError(error || 'Failed to send invoice.');
      }
    } catch (err) {
      setInvoiceError('An error occurred while sending the invoice.');
    }

    setIsSubmittingInvoice(false);
  };

  if (showPreview && selectedMethod === 'cc') {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <img src="/logo-big.svg" alt="Vercatryx Logo" className="mx-auto h-16 w-auto mb-4" />
            <CardTitle>Credit Card Payment</CardTitle>
            <CardDescription>Review your payment details and enter your card information below. Total: ${total.toFixed(2)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-semibold">Payment Breakdown</h4>
              <div className="border rounded-md p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Service Amount:</span>
                  <span>${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Fee (3%):</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold">
                  <span>Total Due:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {clientSecret && (
              <div className="pt-4">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm total={total} clientSecret={clientSecret} />
                </Elements>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleEditAmount}
              >
                Edit Amount
              </Button>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showAmountForm) {
    const isCc = selectedMethod === 'cc';
    return (
      <div className="container mx-auto py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <img src="/logo-big.svg" alt="Vercatryx Logo" className="mx-auto h-12 w-auto mb-4" />
            <CardTitle>{isCc ? 'Credit Card' : selectedMethod.toUpperCase()} Payment</CardTitle>
            <CardDescription>
              {isCc 
                ? 'Enter the amount you wish to pay. A 3% credit card processing fee will be added.' 
                : 'Enter the amount for your payment.'}
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
                />
              </div>
              <Button type="submit" className="w-full">
                {isCc ? 'Continue to Payment' : 'Continue'}
              </Button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </form>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setShowAmountForm(false); setSelectedMethod(''); }} 
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
              Select your preferred payment method.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                type="button"
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => handleMethodSelect('wire')}
              >
                <span className="mb-1">🏦</span>
                Wire Transfer
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
              <Button
                type="button"
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => handleMethodSelect('zelle')}
              >
                <span className="mb-1">💰</span>
                Zelle
              </Button>
            </div>
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
                <p className="text-sm">Please initiate a wire transfer. Contact us to confirm the amount and receive exact details.</p>
                <div className="border rounded-md p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Bank Name:</span><span>Dummy Bank</span></div>
                  <div className="flex justify-between"><span>Account Number:</span><span>123456789</span></div>
                  <div className="flex justify-between"><span>Routing Number:</span><span>987654321</span></div>
                  <div className="flex justify-between"><span>Beneficiary:</span><span>Vercatryx</span></div>
                  <div className="flex justify-between"><span>Reference:</span><span>Contact for specific reference</span></div>
                </div>
                <p className="text-xs text-gray-600">After transfer, email confirmation to info@vercatryx.com.</p>
              </div>
            )}
            {selectedMethod === 'zelle' && (
              <div className="space-y-2">
                <h4 className="font-semibold">Zelle Payment Details</h4>
                <p className="text-sm">Send payment via Zelle. Contact us to confirm the amount.</p>
                <div className="border rounded-md p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Zelle Email:</span><span>info@vercatryx.com</span></div>
                  <div className="flex justify-between"><span>Or Phone:</span><span>(347) 215-0400</span></div>
                  <div className="flex justify-between"><span>Memo:</span><span>Contact for specific memo</span></div>
                </div>
                <p className="text-xs text-gray-600">After sending, email confirmation to info@vercatryx.com.</p>
              </div>
            )}

            {/* Invoice Request Form in Dialog */}
            <div className="border-t pt-4">
              <h5 className="font-semibold mb-3">Request Proforma Invoice</h5>
              <p className="text-xs mb-3">Provide details including the payment amount to receive a proforma invoice:</p>
              <form onSubmit={handleInvoiceSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="invoiceName" className="text-xs font-medium block">
                    Full Name
                  </label>
                  <Input
                    id="invoiceName"
                    size="sm"
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
                    size="sm"
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
                    size="sm"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
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
