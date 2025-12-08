'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, Check, X, Copy, Trash2, Mail, CreditCard, FileText, Send } from 'lucide-react';
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
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [receiptPaymentIntentId, setReceiptPaymentIntentId] = useState<string | undefined>(undefined);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState<string | null>(null);
  const [billingHistory, setBillingHistory] = useState<Record<string, any[]>>({});
  const [loadingBillingHistory, setLoadingBillingHistory] = useState<Record<string, boolean>>({});

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

  // Load billing history for interval payments
  useEffect(() => {
    const intervalPayments = paymentRequests.filter(r => r.payment_type === 'interval_billing' && r.invoice_number);
    intervalPayments.forEach(req => {
      if (!billingHistory[req.id] && !loadingBillingHistory[req.id]) {
        loadBillingHistory(req.id);
      }
    });
  }, [paymentRequests]);

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
    
    // Keep billingPayment set during billing, close dialog
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
    } finally {
      // Clear billingPayment only after billing is complete
      setBillingPayment(null);
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

  const handleViewReceipt = async (id: string, paymentIntentId?: string) => {
    setLoadingReceipt(true);
    setShowReceiptDialog(true);
    setReceiptPaymentId(id);
    setReceiptPaymentIntentId(paymentIntentId);
    try {
      const url = paymentIntentId 
        ? `/api/admin/payments/${id}/receipt?paymentIntentId=${paymentIntentId}`
        : `/api/admin/payments/${id}/receipt`;
      const res = await fetch(url);
      if (res.ok) {
        const { receipt } = await res.json();
        setReceiptData(receipt);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to load receipt');
        setShowReceiptDialog(false);
        setReceiptPaymentId(null);
        setReceiptPaymentIntentId(undefined);
      }
    } catch (err) {
      toast.error('Failed to load receipt');
      setShowReceiptDialog(false);
      setReceiptPaymentId(null);
      setReceiptPaymentIntentId(undefined);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleSendReceipt = async (id: string, paymentIntentId?: string) => {
    // Create a unique key for this specific receipt (combines id and paymentIntentId)
    const receiptKey = paymentIntentId ? `${id}-${paymentIntentId}` : id;
    setSendingReceipt(receiptKey);
    try {
      const url = paymentIntentId 
        ? `/api/admin/payments/${id}/receipt?paymentIntentId=${paymentIntentId}`
        : `/api/admin/payments/${id}/receipt`;
      const res = await fetch(url, {
        method: 'POST',
      });

      if (res.ok) {
        const { invoiceNumber } = await res.json();
        toast.success(`Receipt sent successfully! (Invoice #${invoiceNumber})`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to send receipt');
      }
    } catch (err) {
      toast.error('Failed to send receipt');
    } finally {
      setSendingReceipt(null);
    }
  };

  const loadBillingHistory = async (paymentId: string) => {
    if (billingHistory[paymentId] || loadingBillingHistory[paymentId]) return;
    
    setLoadingBillingHistory(prev => ({ ...prev, [paymentId]: true }));
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/billings`);
      if (res.ok) {
        const { billings } = await res.json();
        setBillingHistory(prev => ({ ...prev, [paymentId]: billings || [] }));
      }
    } catch (err) {
      console.error('Failed to load billing history:', err);
    } finally {
      setLoadingBillingHistory(prev => ({ ...prev, [paymentId]: false }));
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
                  Pending ({paymentRequests.filter(r => {
                    const isRecurringWithPaymentMethod = (r.payment_type === 'interval_billing' || r.payment_type === 'monthly') && r.stripe_payment_method_id;
                    return (r.status === 'pending' || r.status === 'invoiced') && !isRecurringWithPaymentMethod;
                  }).length})
                </TabsTrigger>
                <TabsTrigger value="intervals">
                  Intervals ({paymentRequests.filter(r => (r.payment_type === 'interval_billing' || r.payment_type === 'monthly') && r.stripe_payment_method_id).length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  History ({paymentRequests.filter(r => {
                    // Show completed payments (one-time and monthly)
                    // Also show interval_billing payments that have been billed (have invoice_number)
                    return r.status === 'completed' || (r.payment_type === 'interval_billing' && r.invoice_number);
                  }).length})
                </TabsTrigger>
              </TabsList>

              {/* Pending Tab */}
              <TabsContent value="pending" className="mt-4">
                {paymentRequests.filter(r => {
                  const isRecurringWithPaymentMethod = (r.payment_type === 'interval_billing' || r.payment_type === 'monthly') && r.stripe_payment_method_id;
                  return (r.status === 'pending' || r.status === 'invoiced') && !isRecurringWithPaymentMethod;
                }).length === 0 ? (
                  <p className="text-muted-foreground">No pending payments.</p>
          ) : (
            <div className="space-y-3">
                    {paymentRequests
                      .filter(r => {
                        const isRecurringWithPaymentMethod = (r.payment_type === 'interval_billing' || r.payment_type === 'monthly') && r.stripe_payment_method_id;
                        return (r.status === 'pending' || r.status === 'invoiced') && !isRecurringWithPaymentMethod;
                      })
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
                      .sort((a, b) => {
                        // Sort by status: pending/invoiced first, then completed
                        const statusOrder = { 'pending': 0, 'invoiced': 1, 'completed': 2, 'cancelled': 3 };
                        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
                        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
                        if (aOrder !== bOrder) return aOrder - bOrder;
                        // Then by date (newest first)
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      })
                      .map((req) => {
                        const { name: displayName, email: displayEmail } = getRequestDisplayInfo(req);
                        return (
                          <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                {displayEmail} - Amount set when billing - {new Date(req.created_at).toLocaleDateString()}
                                {req.invoice_number && (
                                  <span className="ml-2 font-semibold text-foreground">Last Invoice #: {req.invoice_number}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {statusBadge(req.status)}
                                <Badge variant="outline">
                                  {req.payment_type === 'monthly' ? 'Monthly' : 'Interval Billing'}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Payment Method Saved
                                </Badge>
                                {req.payment_type === 'interval_billing' && req.status === 'invoiced' && (
                                  <Badge variant="default" className="text-xs bg-blue-600">
                                    Ready to Bill Again
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* For interval_billing, always show Bill Now button (even if completed) */}
                              {/* For monthly, only show if not completed */}
                              {(req.payment_type === 'interval_billing' || req.status !== 'completed') && (
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
                              )}
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
                {(() => {
                  // Get all completed payments (one-time and monthly)
                  const completedPayments = paymentRequests.filter(r => r.status === 'completed' && r.payment_type !== 'interval_billing');
                  
                  // Get interval billing payments that have been billed
                  const intervalPayments = paymentRequests.filter(r => r.payment_type === 'interval_billing' && r.invoice_number);
                  
                  // Create entries for all billings
                  const allHistoryEntries: any[] = [];
                  
                  // Add completed payments
                  completedPayments.forEach(req => {
                    allHistoryEntries.push({
                      type: 'payment',
                      paymentRequest: req,
                      billing: null,
                    });
                  });
                  
                  // Add each billing for interval payments
                  intervalPayments.forEach(req => {
                    const billings = billingHistory[req.id] || [];
                    if (billings.length > 0) {
                      billings.forEach(billing => {
                        allHistoryEntries.push({
                          type: 'billing',
                          paymentRequest: req,
                          billing: billing,
                        });
                      });
                    } else if (req.invoice_number) {
                      // Fallback: show payment request if billing history not loaded yet
                      allHistoryEntries.push({
                        type: 'payment',
                        paymentRequest: req,
                        billing: null,
                      });
                    }
                  });
                  
                  // Sort by date (most recent first)
                  allHistoryEntries.sort((a, b) => {
                    const dateA = a.billing ? new Date(a.billing.date).getTime() : new Date(a.paymentRequest.updated_at || a.paymentRequest.created_at).getTime();
                    const dateB = b.billing ? new Date(b.billing.date).getTime() : new Date(b.paymentRequest.updated_at || b.paymentRequest.created_at).getTime();
                    return dateB - dateA;
                  });
                  
                  if (allHistoryEntries.length === 0) {
                    return <p className="text-muted-foreground">No completed payments yet.</p>;
                  }
                  
                  return (
                    <div className="space-y-3">
                      {allHistoryEntries.map((entry, idx) => {
                        const req = entry.paymentRequest;
                        const billing = entry.billing;
                        const { name: displayName, email: displayEmail } = getRequestDisplayInfo(req);
                        const invoiceNumber = billing?.invoiceNumber || req.invoice_number;
                        const amount = billing?.amount || req.amount;
                        const date = billing ? new Date(billing.date) : new Date(req.updated_at || req.created_at);
                        
                        return (
                          <div key={`${req.id}-${billing?.paymentIntentId || idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                {displayEmail} - ${amount.toFixed(2)} - {date.toLocaleDateString()}
                                {invoiceNumber && (
                                  <span className="ml-2 font-semibold text-foreground">Invoice #: {invoiceNumber}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {statusBadge(req.status)}
                                <Badge variant="outline">
                                  {req.payment_type === 'one_time' ? 'One-Time' : 
                                   req.payment_type === 'monthly' ? 'Monthly' : 
                                   'Interval Billing'}
                                </Badge>
                                {billing && (
                                  <Badge variant="secondary" className="text-xs">
                                    {billing.paymentMethod === 'ach' ? 'ACH' : 'Card'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReceipt(req.id, billing?.paymentIntentId)}
                                title="View Receipt"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendReceipt(req.id, billing?.paymentIntentId)}
                                disabled={sendingReceipt === (billing?.paymentIntentId ? `${req.id}-${billing.paymentIntentId}` : req.id)}
                                title="Send Receipt"
                              >
                                {sendingReceipt === (billing?.paymentIntentId ? `${req.id}-${billing.paymentIntentId}` : req.id) ? (
                                  'Sending...'
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                              {req.payment_type !== 'interval_billing' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyLink(req.public_token)}
                                    title="Copy Link"
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
                                    title="Open Payment Link"
                                  >
                                    Open Link
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(req.id)}
                                    disabled={deleting === req.id}
                                    title="Delete"
                                  >
                                    {deleting === req.id ? 'Deleting...' : <Trash2 className="w-4 h-4" />}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              Receipt details for this payment
            </DialogDescription>
          </DialogHeader>
          {loadingReceipt ? (
            <div className="py-8 text-center">Loading receipt...</div>
          ) : receiptData ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Invoice Number</Label>
                  <p className="font-semibold">{receiptData.invoiceNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p>{new Date(receiptData.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Bill To</Label>
                <p className="font-medium">{receiptData.recipientName}</p>
                <p className="text-sm text-muted-foreground">{receiptData.recipientEmail}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Payment Details</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Service Amount:</span>
                    <span className="font-medium">${receiptData.amount.toFixed(2)}</span>
                  </div>
                  {receiptData.fee > 0 && (
                    <div className="flex justify-between">
                      <span>Processing Fee (3%):</span>
                      <span className="font-medium">${receiptData.fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-semibold text-lg">
                    <span>Total Paid:</span>
                    <span>${receiptData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="capitalize">{receiptData.paymentMethod === 'ach' ? 'ACH Bank Transfer' : receiptData.paymentMethod === 'card' ? 'Credit/Debit Card' : receiptData.paymentMethod}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Type</Label>
                  <p className="capitalize">
                    {receiptData.paymentType === 'one_time' ? 'One-Time' : 
                     receiptData.paymentType === 'monthly' ? 'Monthly' : 
                     'Interval Billing'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No receipt data available</div>
          )}
          <DialogFooter>
            {receiptData && receiptPaymentId && (
              <Button 
                onClick={() => handleSendReceipt(receiptPaymentId, receiptPaymentIntentId)}
                disabled={sendingReceipt === (receiptPaymentIntentId ? `${receiptPaymentId}-${receiptPaymentIntentId}` : receiptPaymentId)}
              >
                {sendingReceipt === (receiptPaymentIntentId ? `${receiptPaymentId}-${receiptPaymentIntentId}` : receiptPaymentId) ? 'Sending...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Receipt
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setShowReceiptDialog(false);
              setReceiptData(null);
              setReceiptPaymentId(null);
              setReceiptPaymentIntentId(undefined);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
