import { put, list } from '@vercel/blob';

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

interface AvailabilityStore {
  [key: string]: AvailabilityRequest;
}

const BLOB_FILENAME = 'availability-requests.json';

/**
 * Get all availability requests from blob storage
 */
async function getAllRequests(): Promise<AvailabilityStore> {
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not configured. Availability requests will not be persisted.');
      return {};
    }

    // List blobs to find our file
    const { blobs } = await list({ prefix: BLOB_FILENAME });

    if (blobs.length === 0) {
      console.log('No availability requests blob found, returning empty store');
      return {};
    }

    // Sort by uploadedAt to get the most recent blob
    const sortedBlobs = blobs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    const blob = sortedBlobs[0];

    console.log(`Found ${blobs.length} availability blob(s), using most recent from:`, blob.uploadedAt);
    const response = await fetch(blob.url);

    // Check if response is ok and content-type is JSON
    if (!response.ok) {
      console.error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
      return {};
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Blob returned non-JSON content-type: ${contentType}`);
      const text = await response.text();
      console.error('Response preview:', text.substring(0, 200));
      return {};
    }

    const data = await response.json();
    return data as AvailabilityStore;
  } catch (error) {
    console.error('Error reading from blob:', error);
    // If blob doesn't exist, return empty object
    return {};
  }
}

/**
 * Save all availability requests to blob storage
 */
async function saveAllRequests(requests: AvailabilityStore): Promise<void> {
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured. Cannot save availability requests. Please configure Vercel Blob storage.');
    }

    await put(BLOB_FILENAME, JSON.stringify(requests, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false, // Important: don't add random suffix to filename
      allowOverwrite: true, // Allow updating the existing blob
    });
  } catch (error) {
    console.error('Error writing to blob:', error);
    throw error;
  }
}

/**
 * Clean up old requests (older than 24 hours)
 */
function cleanupOldRequests(requests: AvailabilityStore): AvailabilityStore {
  const now = new Date();
  const cleaned: AvailabilityStore = {};

  for (const [id, request] of Object.entries(requests)) {
    const createdAt = new Date(request.createdAt);
    const diffHours = (now.getTime() - createdAt.getTime()) / 1000 / 60 / 60;

    // Keep requests that are less than 24 hours old
    if (diffHours < 24) {
      cleaned[id] = request;
    }
  }

  return cleaned;
}

/**
 * Save an availability request to the database
 */
export async function saveAvailabilityRequest(request: AvailabilityRequest): Promise<void> {
  let requests = await getAllRequests();

  // Clean up old requests before saving
  requests = cleanupOldRequests(requests);

  requests[request.id] = request;
  await saveAllRequests(requests);
}

/**
 * Get an availability request from the database
 */
export async function getAvailabilityRequest(id: string): Promise<AvailabilityRequest | null> {
  const requests = await getAllRequests();
  return requests[id] || null;
}

/**
 * Update the status of an availability request
 */
export async function updateAvailabilityStatus(
  id: string,
  status: 'available' | 'unavailable' | 'timeout'
): Promise<AvailabilityRequest | null> {
  const requests = await getAllRequests();
  const request = requests[id];

  if (!request) {
    return null;
  }

  request.status = status;
  request.respondedAt = new Date().toISOString();

  requests[id] = request;
  await saveAllRequests(requests);

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
