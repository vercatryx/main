import { getServerSupabaseClient } from '@/lib/supabase';
import { generatePublicToken } from '@/lib/pdf-signatures';
import type { User } from '@/types/company';

export interface PaymentRequest {
  id: string;
  user_id: string | null;
  amount: number;
  status: 'pending' | 'invoiced' | 'completed' | 'cancelled';
  public_token: string;
  created_by_clerk_user_id: string;
  created_at: string;
  updated_at: string;
  recipient_email: string;
  recipient_name: string;
  payment_type: 'one_time' | 'monthly' | 'interval_billing';
  monthly_amounts?: number[] | null;
  next_billing_date?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_method_id?: string | null;
  users?: Pick<User, 'email' | 'first_name' | 'last_name'> | null;
}

export async function createPaymentRequest(params: {
  userId?: string;
  recipientEmail: string;
  recipientName: string;
  amount: number;
  createdByClerkUserId: string;
  paymentType?: 'one_time' | 'monthly' | 'interval_billing';
  monthlyAmounts?: number[];
  nextBillingDate?: string;
}): Promise<PaymentRequest> {
  const supabase = getServerSupabaseClient();
  const publicToken = generatePublicToken(16);

  // Calculate next billing date for monthly payments (default to next month)
  let calculatedNextBillingDate = params.nextBillingDate;
  if (!calculatedNextBillingDate && (params.paymentType === 'monthly' || params.paymentType === 'interval_billing')) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    calculatedNextBillingDate = nextMonth.toISOString().split('T')[0];
  }

  const insertData: any = {
    amount: params.amount,
    public_token: publicToken,
    created_by_clerk_user_id: params.createdByClerkUserId,
    status: 'pending',
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    payment_type: params.paymentType || 'one_time',
    next_billing_date: calculatedNextBillingDate || null,
  };

  // Note: monthly_amounts column removed - we're not using it anymore for interval_billing
  // If you need to add it back, you'll need to add the column to the database first

  if (params.userId) {
    insertData.user_id = params.userId;
  }

  const { data, error } = await supabase
    .from('payments_requests')
    .insert(insertData)
    .select('*, users (email, first_name, last_name)')
    .single();

  if (error) {
    console.error('Error creating payment request:', error);
    throw new Error('Failed to create payment request');
  }

  // Parse monthly_amounts if it's a string
  if (data.monthly_amounts && typeof data.monthly_amounts === 'string') {
    data.monthly_amounts = JSON.parse(data.monthly_amounts);
  }

  return data as PaymentRequest;
}

export async function getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('payments_requests')
    .select(`
      *,
      users (email, first_name, last_name)
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') { // No rows
    console.error('Error fetching payment request:', error);
    throw new Error('Failed to fetch payment request');
  }

  if (data && !data.users && data.recipient_email) {
    // No linked user, use recipient info
    data.users = null; // Ensure it's null for consistency
  }

  // Parse monthly_amounts if it's a string
  if (data && data.monthly_amounts && typeof data.monthly_amounts === 'string') {
    data.monthly_amounts = JSON.parse(data.monthly_amounts);
  }

  return data as PaymentRequest | null;
}

export async function getPaymentRequestByToken(token: string): Promise<PaymentRequest | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('payments_requests')
    .select(`
      *,
      users (email, first_name, last_name)
    `)
    .eq('public_token', token)
    .single();

  if (error && error.code !== 'PGRST116') { // No rows
    console.error('Error fetching payment request:', error);
    throw new Error('Failed to fetch payment request');
  }

  if (data && !data.users && data.recipient_email) {
    // No linked user, use recipient info
    data.users = null; // Ensure it's null for consistency
  }

  // Parse monthly_amounts if it's a string
  if (data && data.monthly_amounts && typeof data.monthly_amounts === 'string') {
    data.monthly_amounts = JSON.parse(data.monthly_amounts);
  }

  return data as PaymentRequest | null;
}

export async function getPaymentRequestsByUser(userId: string): Promise<PaymentRequest[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('payments_requests')
    .select(`
      *,
      users (email, first_name, last_name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user payment requests:', error);
    throw new Error('Failed to fetch user payment requests');
  }

  // Parse monthly_amounts for each request
  if (data) {
    data.forEach((req: any) => {
      if (req.monthly_amounts && typeof req.monthly_amounts === 'string') {
        req.monthly_amounts = JSON.parse(req.monthly_amounts);
      }
    });
  }

  return data as PaymentRequest[];
}

export async function updatePaymentRequestStatus(token: string, status: 'invoiced' | 'completed' | 'cancelled'): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from('payments_requests')
    .update({ 
      status, 
      updated_at: new Date().toISOString()
    })
    .eq('public_token', token);

  if (error) {
    console.error('Error updating payment request status:', error);
    throw new Error('Failed to update payment request status');
  }
}

export async function getAllPaymentRequests(): Promise<PaymentRequest[]> {
  const supabase = getServerSupabaseClient();

  let query = supabase
    .from('payments_requests')
    .select(`
      *,
      users (
        email,
        first_name,
        last_name,
        company_id
      )
    `)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all payment requests:', error);
    throw new Error('Failed to fetch all payment requests');
  }

  // Parse monthly_amounts for each request
  if (data) {
    data.forEach((req: any) => {
      if (req.monthly_amounts && typeof req.monthly_amounts === 'string') {
        req.monthly_amounts = JSON.parse(req.monthly_amounts);
      }
    });
  }

  return data as PaymentRequest[];
}

export async function getCompanyPaymentRequests(companyId: string): Promise<PaymentRequest[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('payments_requests')
    .select(`
      *,
      users (
        email,
        first_name,
        last_name,
        company_id
      )
    `)
    .or(`user_id.eq.${companyId},users.company_id.eq.${companyId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching company payment requests:', error);
    throw new Error('Failed to fetch company payment requests');
  }

  // Parse monthly_amounts for each request
  if (data) {
    data.forEach((req: any) => {
      if (req.monthly_amounts && typeof req.monthly_amounts === 'string') {
        req.monthly_amounts = JSON.parse(req.monthly_amounts);
      }
    });
  }

  return data as PaymentRequest[];
}

export async function deletePaymentRequest(id: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from('payments_requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting payment request:', error);
    throw new Error('Failed to delete payment request');
  }
}

export async function updatePaymentRequestStripeInfo(
  id: string,
  stripeCustomerId?: string,
  stripePaymentMethodId?: string
): Promise<void> {
  const supabase = getServerSupabaseClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (stripeCustomerId !== undefined) {
    updateData.stripe_customer_id = stripeCustomerId;
  }

  if (stripePaymentMethodId !== undefined) {
    updateData.stripe_payment_method_id = stripePaymentMethodId;
  }

  const { error } = await supabase
    .from('payments_requests')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating payment request Stripe info:', error);
    throw new Error('Failed to update payment request Stripe info');
  }
}

export async function updatePaymentRequestNextBillingDate(
  id: string,
  nextBillingDate: string
): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from('payments_requests')
    .update({
      next_billing_date: nextBillingDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating payment request next billing date:', error);
    throw new Error('Failed to update payment request next billing date');
  }
}

// Helper to get display name/email for a request
export function getRequestDisplayInfo(request: PaymentRequest): { name: string; email: string } {
  if (request.users) {
    return {
      name: `${request.users.first_name || ''} ${request.users.last_name || ''}`.trim() || request.users.email,
      email: request.users.email,
    };
  } else {
    return {
      name: request.recipient_name || 'Unknown',
      email: request.recipient_email || 'Unknown',
    };
  }
}
