'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Check, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentRequest, getRequestDisplayInfo } from '@/lib/payments';

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
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
    if (!recipientName || !recipientEmail || !amount || parseFloat(amount) <= 0) {
      toast.error('Enter recipient name, email, and valid amount');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipientName, 
          recipientEmail,
          amount: parseFloat(amount) 
        }),
      });

      if (res.ok) {
        const { request } = await res.json();
        setPaymentRequests([request, ...paymentRequests]);
        setRecipientName('');
        setRecipientEmail('');
        setAmount('');
        toast.success('Payment request created');
        if (onDataChange) onDataChange();
        // Copy link
        const link = `${window.location.origin}/payments?public_token=${request.public_token}`;
        await navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard!');
      } else {
        toast.error('Failed to create request');
      }
    } catch (err) {
      toast.error('Failed to create request');
    } finally {
      setCreating(false);
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
        setPaymentRequests(prev => 
          prev.map(r => r.public_token === token ? { ...r, status: 'completed' } : r)
        );
        toast.success('Payment marked as completed');
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
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount ($)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                className="flex-1"
              />
              <Button onClick={handleCreateRequest} disabled={creating || !recipientName || !recipientEmail || !amount}>
                {creating ? 'Creating...' : 'Create & Copy Link'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment Requests ({paymentRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : paymentRequests.length === 0 ? (
            <p>No payment requests yet.</p>
          ) : (
            <div className="space-y-3">
              {paymentRequests.map((req) => {
                const { name: displayName, email: displayEmail } = getRequestDisplayInfo(req);
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{displayName}</div>
                      <div className="text-sm text-muted-foreground">{displayEmail} - ${req.amount.toFixed(2)} - {new Date(req.created_at).toLocaleDateString()}</div>
                      {statusBadge(req.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' || req.status === 'invoiced' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkComplete(req.public_token)}
                          disabled={updatingStatus === req.public_token}
                        >
                          {updatingStatus === req.public_token ? 'Updating...' : <Check className="w-4 h-4" />}
                        </Button>
                      ) : null}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
