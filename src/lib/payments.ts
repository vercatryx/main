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
  users?: Pick<User, 'email' | 'first_name' | 'last_name'> | null;
}

export async function createPaymentRequest(params: {
  userId?: string;
  recipientEmail: string;
  recipientName: string;
  amount: number;
  createdByClerkUserId: string;
}): Promise<PaymentRequest> {
  const supabase = getServerSupabaseClient();
  const publicToken = generatePublicToken(16);

  const insertData: any = {
    amount: params.amount,
    public_token: publicToken,
    created_by_clerk_user_id: params.createdByClerkUserId,
    status: 'pending',
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
  };

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

  return data as PaymentRequest;
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

  return data as PaymentRequest[];
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
