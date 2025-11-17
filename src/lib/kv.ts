import { kv } from '@vercel/kv';

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

const AVAILABILITY_PREFIX = 'availability:';
const AVAILABILITY_TTL = 60 * 60 * 24; // 24 hours in seconds

/**
 * Save an availability request to the database
 */
export async function saveAvailabilityRequest(request: AvailabilityRequest): Promise<void> {
  const key = `${AVAILABILITY_PREFIX}${request.id}`;
  await kv.set(key, request, { ex: AVAILABILITY_TTL });
}

/**
 * Get an availability request from the database
 */
export async function getAvailabilityRequest(id: string): Promise<AvailabilityRequest | null> {
  const key = `${AVAILABILITY_PREFIX}${id}`;
  const request = await kv.get<AvailabilityRequest>(key);
  return request;
}

/**
 * Update the status of an availability request
 */
export async function updateAvailabilityStatus(
  id: string,
  status: 'available' | 'unavailable' | 'timeout'
): Promise<AvailabilityRequest | null> {
  const request = await getAvailabilityRequest(id);

  if (!request) {
    return null;
  }

  request.status = status;
  request.respondedAt = new Date().toISOString();

  await saveAvailabilityRequest(request);

  return request;
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
