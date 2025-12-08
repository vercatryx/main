'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, Check, X, Copy, Trash2, Mail, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentRequest, getRequestDisplayInfo } from '@/lib/payments';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface PaymentsManagementProps {
  companies: any[];
  isSuperAdmin: boolean;
  currentUser: any;
  onDataChange?: () => void;
}

export default function PaymentsManagementNew({ 
  companies, 
  isSuperAdmin, 
  currentUser, 
  onDataChange 
}: PaymentsManagementProps) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'one_time' | 'monthly' | 'interval_billing'>('one_time');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);
  const [billingPayment, setBillingPayment] = useState<string | null>(null);
  const [billingAmount, setBillingAmount] = useState('');
  const [showBillingDialog, setShowBillingDialog] = useState(false);

  // Load payment requests
  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/payments');
        if (res.ok) {
          const { requests } = await res.json();
          setPaymentRequests(requests);
        }
      } catch (err) {
        toast.error('Failed to load payment requests');
      } finally {
        setLoading(false);
      }
    };
    loadRequests();
  }, []);

  const handleCreateRequest = async () => {
    if (!recipientName || !recipientEmail) {
      toast.error('Enter recipient name and email');
      return;
    }

    // Amount is optional for interval_billing and monthly, required only for one_time
    if (paymentType === 'one_time' && (!amount || parseFloat(amount) <= 0)) {
      toast.error('Enter a valid amount');
      return;
    }

    setCreating(true);
    try {
      const body: any = {
        recipientName,
        recipientEmail,
        amount: (paymentType === 'interval_billing' || paymentType === 'monthly') ? 0 : parseFloat(amount), // Use 0 as placeholder for recurring payments
        paymentType,
      };

      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const { request } = await res.json();
        setPaymentRequests([request, ...paymentRequests]);
        setRecipientName('');
        setRecipientEmail('');
        setAmount('');
        setPaymentType('one_time');
        toast.success('Payment request created');
        if (onDataChange) onDataChange();
        // Copy link
        const link = `${window.location.origin}/payments?public_token=${request.public_token}`;
        await navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard!');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create request');
      }
    } catch (err) {
      toast.error('Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenBillingDialog = (requestId: string) => {
    setBillingPayment(requestId);
    // Leave amount empty - admin enters amount when billing
    setBillingAmount('');
    setShowBillingDialog(true);
  };

  const handleBillPayment = async () => {
    if (!billingPayment || !billingAmount || parseFloat(billingAmount) <= 0) {
      toast.error('Enter a valid amount to bill');
      return;
    }

    const amount = parseFloat(billingAmount);
    const currentBillingId = billingPayment;
    setBillingPayment(null);
    setBillingAmount('');
    setShowBillingDialog(false);

    try {
      const res = await fetch('/api/admin/payments/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBillingId,
          amount,
        }),
      });

      if (res.ok) {
        const { success, message } = await res.json();
        if (success) {
          toast.success(message || 'Payment billed successfully');
          // Reload payment requests
          const loadRes = await fetch('/api/admin/payments');
          if (loadRes.ok) {
            const { requests } = await loadRes.json();
            setPaymentRequests(requests);
          }
          if (onDataChange) onDataChange();
        } else {
          toast.error(message || 'Failed to bill payment');
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to bill payment');
      }
    } catch (err) {
      toast.error('Failed to bill payment');
    }
  };

  const handleMarkComplete = async (token: string) => {
    if (!confirm('Mark this payment as completed?')) return;

    setUpdatingStatus(token);
    try {
      const res = await fetch('/api/payments/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: token, status: 'completed' }),
      });

      if (res.ok) {
        toast.success('Payment marked as completed');
        // Reload payment requests to get fresh data
        const loadRes = await fetch('/api/admin/payments');
        if (loadRes.ok) {
          const { requests } = await loadRes.json();
          setPaymentRequests(requests);
        }
        if (onDataChange) onDataChange();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/payments?public_token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success('Payment link copied!');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment request? This action cannot be undone.')) return;

    setDeleting(id);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setPaymentRequests(prev => prev.filter(r => r.id !== id));
        toast.success('Payment request deleted');
        if (onDataChange) onDataChange();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete payment request');
      }
    } catch (err) {
      toast.error('Failed to delete payment request');
    } finally {
      setDeleting(null);
    }
  };

  const handleSendInvoice = async (id: string) => {
    setSendingInvoice(id);
    try {
      const res = await fetch('/api/admin/payments/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        const { invoiceNumber } = await res.json();
        // Update status to invoiced if it was pending
        setPaymentRequests(prev => 
          prev.map(r => r.id === id && r.status === 'pending' ? { ...r, status: 'invoiced' } : r)
        );
        toast.success(`Invoice sent successfully! (${invoiceNumber})`);
        if (onDataChange) onDataChange();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to send invoice');
      }
    } catch (err) {
      toast.error('Failed to send invoice');
    } finally {
      setSendingInvoice(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'invoiced': return <Badge variant="outline">Invoiced</Badge>;
      case 'completed': return <Badge variant="default">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Create Payment Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Recipient Name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Recipient Email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            <Input
              type="number"
              placeholder={(paymentType === 'interval_billing' || paymentType === 'monthly') ? "Amount ($) - Optional" : "Amount ($)"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              disabled={paymentType === 'interval_billing' || paymentType === 'monthly'}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select value={paymentType} onValueChange={(value: 'one_time' | 'monthly' | 'interval_billing') => {
              setPaymentType(value);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-Time Payment</SelectItem>
                <SelectItem value="monthly">Monthly Recurring (Same Amount)</SelectItem>
                <SelectItem value="interval_billing">Interval Billing (Bill any amount as needed)</SelectItem>
              </SelectContent>
            </Select>
            {(paymentType === 'interval_billing' || paymentType === 'monthly') && (
              <p className="text-sm text-muted-foreground">
                For recurring payments, no amount is required. You can bill any amount at any time after the customer has saved their payment method. Only card and ACH payment methods are available.
              </p>
            )}
          </div>

          <Button 
            onClick={handleCreateRequest} 
            disabled={creating || !recipientName || !recipientEmail || (paymentType === 'one_time' && !amount)}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create & Copy Link'}
          </Button>
        </CardContent>
      </Card>

      {/* List Requests with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({paymentRequests.filter(r => r.status === 'pending' || r.status === 'invoiced').length})
                </TabsTrigger>
                <TabsTrigger value="intervals">
                  Intervals ({paymentRequests.filter(r => (r.payment_type === 'interval_billing' || r.payment_type === 'monthly') && r.stripe_payment_method_id).length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  History ({paymentRequests.filter(r => r.status === 'completed').length})
                </TabsTrigger>
              </TabsList>

              {/* Pending Tab */}
              <TabsContent value="pending" className="mt-4">
                {paymentRequests.filter(r => r.status === 'pending' || r.status === 'invoiced').length === 0 ? (
                  <p className="text-muted-foreground">No pending payments.</p>
          ) : (
            <div className="space-y-3">
                    {paymentRequests
                      .filter(r => r.status === 'pending' || r.status === 'invoiced')
                      .map((req) => {
                const { name: displayName, email: displayEmail } = getRequestDisplayInfo(req);
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        {displayEmail} - {(req.payment_type === 'interval_billing' || req.payment_type === 'monthly') ? 'Amount set when billing' : `$${req.amount.toFixed(2)}`} - {new Date(req.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {statusBadge(req.status)}
                        <Badge variant="outline">
                          {req.payment_type === 'one_time' ? 'One-Time' : 
                           req.payment_type === 'monthly' ? 'Monthly' : 
                           'Interval Billing'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSendInvoice(req.id)}
                        disabled={sendingInvoice === req.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {sendingInvoice === req.id ? (
                          'Sending...'
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-1" />
                            Send Invoice
                          </>
                        )}
                      </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkComplete(req.public_token)}
                          disabled={updatingStatus === req.public_token}
                        >
                          {updatingStatus === req.public_token ? 'Updating...' : <Check className="w-4 h-4" />}
                        </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(req.public_token)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = `${window.location.origin}/payments?public_token=${req.public_token}`;
                                  window.open(link, '_blank');
                                }}
                              >
                                Open Link
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(req.id)}
                                disabled={deleting === req.id}
                              >
                                {deleting === req.id ? 'Deleting...' : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </TabsContent>

              {/* Intervals Tab */}
              <TabsContent value="intervals" className="mt-4">
                {paymentRequests.filter(r => (r.payment_type === 'interval_billing' || r.payment_type === 'monthly') && r.stripe_payment_method_id).length === 0 ? (
                  <p className="text-muted-foreground">No payments with saved payment methods available for billing.</p>
                ) : (
                  <div className="space-y-3">
                    {paymentRequests
                      .filter(r => (r.payment_type === 'interval_billing' || r.payment_type === 'monthly') && r.stripe_payment_method_id)
                      .map((req) => {
                        const { name: displayName, email: displayEmail } = getRequestDisplayInfo(req);
                        return (
                          <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                {displayEmail} - Amount set when billing - {new Date(req.created_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {statusBadge(req.status)}
                                <Badge variant="outline">
                                  {req.payment_type === 'monthly' ? 'Monthly' : 'Interval Billing'}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Payment Method Saved
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenBillingDialog(req.id)}
                                disabled={billingPayment === req.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {billingPayment === req.id ? (
                                  'Billing...'
                                ) : (
                                  <>
                                    <CreditCard className="w-4 h-4 mr-1" />
                                    Bill Now
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(req.public_token)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = `${window.location.origin}/payments?public_token=${req.public_token}`;
                                  window.open(link, '_blank');
                                }}
                              >
                                Open Link
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(req.id)}
                                disabled={deleting === req.id}
                              >
                                {deleting === req.id ? 'Deleting...' : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-4">
                {paymentRequests.filter(r => r.status === 'completed').length === 0 ? (
                  <p className="text-muted-foreground">No completed payments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {paymentRequests
                      .filter(r => r.status === 'completed')
                      .map((req) => {
                        const { name: displayName, email: displayEmail } = getRequestDisplayInfo(req);
                        return (
                          <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                {displayEmail} - {(req.payment_type === 'interval_billing' || req.payment_type === 'monthly') ? 'Amount set when billing' : `$${req.amount.toFixed(2)}`} - {new Date(req.created_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {statusBadge(req.status)}
                                <Badge variant="outline">
                                  {req.payment_type === 'one_time' ? 'One-Time' : 
                                   req.payment_type === 'monthly' ? 'Monthly' : 
                                   'Interval Billing'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(req.public_token)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = `${window.location.origin}/payments?public_token=${req.public_token}`;
                          window.open(link, '_blank');
                        }}
                      >
                        Open Link
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(req.id)}
                        disabled={deleting === req.id}
                      >
                        {deleting === req.id ? 'Deleting...' : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bill Payment</DialogTitle>
            <DialogDescription>
              Enter the amount to charge the saved payment method. This will automatically charge the customer's card or ACH account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="billingAmount">Amount ($)</Label>
              <Input
                id="billingAmount"
                type="number"
                step="0.01"
                min="0.01"
                value={billingAmount}
                onChange={(e) => setBillingAmount(e.target.value)}
                placeholder="Enter amount to bill"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBillingDialog(false);
              setBillingAmount('');
              setBillingPayment(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleBillPayment} disabled={!billingAmount || parseFloat(billingAmount) <= 0}>
              Bill Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
