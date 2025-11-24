/**
 * Email tracking functions for admin email system
 */

import { getServerSupabaseClient } from './supabase';
import { randomBytes } from 'crypto';

export interface EmailRecord {
  id: string;
  tracking_id: string;
  sender_user_id: string | null;
  recipient_email: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  opened_count: number;
  created_at: string;
}

interface CreateEmailRecordParams {
  senderUserId: string | null;
  recipientEmail: string;
  subject: string;
}

/**
 * Generate a unique tracking ID for email tracking
 * Uses base64url encoding (URL-safe, email-safe) instead of hex to avoid quoted-printable encoding issues
 * Base64url doesn't use = padding and uses - and _ instead of + and /
 * This prevents email clients from breaking the ID with quoted-printable encoding
 */
function generateTrackingId(): string {
  // Generate 18 bytes (144 bits) which gives us exactly 24 characters in base64url (no padding needed)
  // This is plenty of entropy and email-safe (no = characters that trigger quoted-printable)
  const bytes = randomBytes(18);
  
  // Convert to base64url (URL-safe base64)
  // Replace + with -, / with _, and remove = padding
  const base64 = bytes.toString('base64');
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding (critical for email safety)
  
  // Base64url from 18 bytes = exactly 24 characters (no padding needed)
  // This ensures no = signs that could trigger quoted-printable encoding
  if (base64url.length !== 24) {
    console.error(`[Email Tracking] Invalid tracking ID length: ${base64url.length}, expected 24`);
    throw new Error('Failed to generate valid tracking ID');
  }
  
  // Validate no = signs (should be impossible but double-check)
  if (base64url.includes('=')) {
    throw new Error('Tracking ID contains = sign which breaks email encoding');
  }
  
  return base64url;
}

/**
 * Create a new email tracking record
 */
export async function createEmailRecord(
  params: CreateEmailRecordParams
): Promise<EmailRecord> {
  const supabase = getServerSupabaseClient();
  const trackingId = generateTrackingId();

  const { data, error } = await supabase
    .from('admin_emails')
    .insert({
      tracking_id: trackingId,
      sender_user_id: params.senderUserId,
      recipient_email: params.recipientEmail,
      subject: params.subject,
      sent_at: new Date().toISOString(),
      opened_at: null,
      opened_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating email record:', error);
    throw new Error(`Failed to create email record: ${error.message}`);
  }

  return data as EmailRecord;
}

/**
 * Record email open (when tracking pixel is loaded)
 */
export async function recordEmailOpen(trackingId: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  console.log(`[Email Tracking] Starting recordEmailOpen for tracking ID: ${trackingId}`);
  console.log(`[Email Tracking] Tracking ID length: ${trackingId.length}, contains '=': ${trackingId.includes('=')}`);

  try {
    // Get current record first - try exact match
    let email = null;
    let fetchError = null;
    
    const { data, error } = await supabase
      .from('admin_emails')
      .select('id, opened_at, opened_count, tracking_id')
      .eq('tracking_id', trackingId)
      .maybeSingle();
    
    email = data;
    fetchError = error;
    
    // If exact match fails and tracking ID contains =, try to find similar records
    if (!email && fetchError && trackingId.includes('=')) {
      console.log(`[Email Tracking] Exact match failed, trying to find records with partial match...`);
      
      // Get all emails and search for ones that might match
      const { data: allEmails, error: allError } = await supabase
        .from('admin_emails')
        .select('id, opened_at, opened_count, tracking_id');
      
      if (!allError && allEmails) {
        // Try to find a matching record by checking if tracking_id contains our search string
        const partialMatch = allEmails.find((e: any) => 
          e.tracking_id?.includes(trackingId.split('=')[0]) || 
          trackingId.includes(e.tracking_id?.split('=')[0] || '')
        );
        
        if (partialMatch) {
          console.log(`[Email Tracking] Found partial match: ${partialMatch.tracking_id}`);
          email = partialMatch;
          fetchError = null;
          trackingId = partialMatch.tracking_id; // Use the correct tracking ID
        }
      }
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means "no rows returned" which is expected if not found
      console.error(`[Email Tracking] Error fetching email record:`, fetchError);
      throw new Error(`Failed to fetch email record: ${fetchError.message} (code: ${fetchError.code})`);
    }

    if (!email) {
      console.error(`[Email Tracking] Email record not found for tracking ID: ${trackingId}`);
      // Don't throw - just log and return, as the tracking pixel should still load
      console.log(`[Email Tracking] Skipping update - email record not found in database`);
      return;
    }

    console.log(`[Email Tracking] Found email record - opened_at: ${email.opened_at}, opened_count: ${email.opened_count}`);

    // Only set opened_at if it hasn't been set yet, always increment count
    const openedAt = email.opened_at || new Date().toISOString();
    const openedCount = (email.opened_count || 0) + 1;

    console.log(`[Email Tracking] Updating email - opened_at: ${openedAt}, opened_count: ${openedCount}`);

    const { data: updateData, error: updateError } = await supabase
      .from('admin_emails')
      .update({
        opened_at: openedAt,
        opened_count: openedCount,
      })
      .eq('tracking_id', trackingId)
      .select();

    if (updateError) {
      console.error(`[Email Tracking] Error updating email open status:`, updateError);
      throw new Error(`Failed to record email open: ${updateError.message} (code: ${updateError.code})`);
    }

    if (!updateData || updateData.length === 0) {
      console.error(`[Email Tracking] No rows updated for tracking ID: ${trackingId}`);
      throw new Error(`No rows updated for tracking ID: ${trackingId}`);
    }

    console.log(`[Email Tracking] Successfully updated email record:`, updateData);
  } catch (error) {
    console.error(`[Email Tracking] Error in recordEmailOpen:`, error);
    throw error;
  }
}

/**
 * Get all email records for a sender (or all if super admin)
 */
export async function getEmailRecords(
  senderUserId: string | null
): Promise<EmailRecord[]> {
  const supabase = getServerSupabaseClient();

  let query = supabase
    .from('admin_emails')
    .select('*')
    .order('sent_at', { ascending: false });

  // Filter by sender if provided (non-super admins see only their emails)
  if (senderUserId) {
    query = query.eq('sender_user_id', senderUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching email records:', error);
    throw new Error(`Failed to fetch email records: ${error.message}`);
  }

  return (data || []) as EmailRecord[];
}

/**
 * Get email record by tracking ID
 */
export async function getEmailRecordByTrackingId(
  trackingId: string
): Promise<EmailRecord | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('admin_emails')
    .select('*')
    .eq('tracking_id', trackingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching email record:', error);
    throw new Error(`Failed to fetch email record: ${error.message}`);
  }

  return data as EmailRecord;
}

/**
 * Delete an email tracking record by ID
 */
export async function deleteEmailRecord(emailId: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from('admin_emails')
    .delete()
    .eq('id', emailId);

  if (error) {
    console.error('Error deleting email record:', error);
    throw new Error(`Failed to delete email record: ${error.message}`);
  }
}

