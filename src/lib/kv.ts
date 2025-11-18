import { supabase } from './supabase';

export interface AvailabilityRequest {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone: string;
  message?: string;
  status: 'pending' | 'available' | 'unavailable' | 'timeout';
  createdAt: string;
  respondedAt?: string;
}

// Database row type (snake_case from Supabase)
type AvailabilityRequestRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string;
  message: string | null;
  status: 'pending' | 'available' | 'unavailable' | 'timeout';
  created_at: string;
  responded_at: string | null;
};

/**
 * Convert database row to AvailabilityRequest object (snake_case to camelCase)
 */
function rowToRequest(row: AvailabilityRequestRow): AvailabilityRequest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company || undefined,
    phone: row.phone,
    message: row.message || undefined,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at || undefined,
  };
}

/**
 * Convert AvailabilityRequest object to database row (camelCase to snake_case)
 */
function requestToRow(request: Partial<AvailabilityRequest>): Partial<AvailabilityRequestRow> {
  const row: Partial<AvailabilityRequestRow> = {};

  if (request.id !== undefined) row.id = request.id;
  if (request.name !== undefined) row.name = request.name;
  if (request.email !== undefined) row.email = request.email;
  if (request.company !== undefined) row.company = request.company || null;
  if (request.phone !== undefined) row.phone = request.phone;
  if (request.message !== undefined) row.message = request.message || null;
  if (request.status !== undefined) row.status = request.status;
  if (request.createdAt !== undefined) row.created_at = request.createdAt;
  if (request.respondedAt !== undefined) row.responded_at = request.respondedAt || null;

  return row;
}

/**
 * Save an availability request to the database
 */
export async function saveAvailabilityRequest(request: AvailabilityRequest): Promise<void> {
  const row = requestToRow(request);

  const { error } = await supabase
    .from('availability_requests')
    .insert(row);

  if (error) {
    console.error('Error saving availability request:', error);
    throw new Error(`Failed to save availability request: ${error.message}`);
  }
}

/**
 * Get an availability request from the database
 */
export async function getAvailabilityRequest(id: string): Promise<AvailabilityRequest | null> {
  const { data, error } = await supabase
    .from('availability_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error getting availability request:', error);
    return null;
  }

  return data ? rowToRequest(data as AvailabilityRequestRow) : null;
}

/**
 * Update the status of an availability request
 */
export async function updateAvailabilityStatus(
  id: string,
  status: 'available' | 'unavailable' | 'timeout'
): Promise<AvailabilityRequest | null> {
  const updates: Partial<AvailabilityRequestRow> = {
    status,
    responded_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('availability_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating availability status:', error);
    return null;
  }

  return data ? rowToRequest(data as AvailabilityRequestRow) : null;
}

/**
 * Check if a request has timed out (older than 3 minutes)
 */
export function hasRequestTimedOut(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
  return diffMinutes > 3;
}
