import { getServerSupabaseClient } from './supabase';
import { getUserByClerkId } from './users';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './r2';

export interface MeetingDocument {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string; // Clerk user ID
}

export interface Meeting {
  id: string;
  projectId?: string; // Optional - meetings don't always need a project
  companyId?: string; // Optional - for public meetings
  title: string;
  description?: string;
  hostUserId: string; // Clerk user ID of the host (admin)
  participantUserIds: string[]; // Array of Clerk user IDs
  participantCompanyIds: string[]; // Array of Company UUIDs for company-wide access
  accessType: 'users' | 'company' | 'public'; // users = specific users, company = all users in companies, public = anyone with link
  scheduledAt: string; // ISO date string
  duration: number; // Duration in minutes
  jitsiRoomName: string; // Unique Jitsi room name
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  documents?: MeetingDocument[]; // Array of attached documents
  meetingRequestId?: string; // Optional - links back to meeting_request if created from scheduling
}

// Type for database row (snake_case from Supabase)
type MeetingRow = {
  id: string;
  project_id: string | null;
  company_id: string | null;
  title: string;
  description: string | null;
  host_user_id: string;
  participant_user_ids: string[];
  participant_company_ids: string[];
  access_type: 'users' | 'company' | 'public';
  scheduled_at: string;
  duration: number;
  jitsi_room_name: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  documents: any; // JSONB array of MeetingDocument
  meeting_request_id: string | null;
};

/**
 * Convert database row to Meeting object (snake_case to camelCase)
 */
function rowToMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    projectId: row.project_id || undefined,
    companyId: row.company_id || undefined,
    title: row.title,
    description: row.description || undefined,
    hostUserId: row.host_user_id,
    participantUserIds: row.participant_user_ids || [],
    participantCompanyIds: row.participant_company_ids || [],
    accessType: row.access_type,
    scheduledAt: row.scheduled_at,
    duration: row.duration,
    jitsiRoomName: row.jitsi_room_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at || undefined,
    endedAt: row.ended_at || undefined,
    documents: row.documents ? (Array.isArray(row.documents) ? row.documents : []) : undefined,
    meetingRequestId: row.meeting_request_id || undefined,
  };
}

/**
 * Convert Meeting object to database row (camelCase to snake_case)
 */
function meetingToRow(meeting: Partial<Meeting>): Partial<MeetingRow> {
  const row: Partial<MeetingRow> = {};

  // Only include id if it's a valid non-empty string (let DB generate if empty/undefined)
  if (meeting.id !== undefined && meeting.id !== null && meeting.id !== '') {
    row.id = meeting.id;
  }
  if (meeting.projectId !== undefined) row.project_id = meeting.projectId || null;
  if (meeting.companyId !== undefined) row.company_id = meeting.companyId || null;
  if (meeting.title !== undefined) row.title = meeting.title;
  if (meeting.description !== undefined) row.description = meeting.description || null;
  if (meeting.hostUserId !== undefined) row.host_user_id = meeting.hostUserId;
  if (meeting.participantUserIds !== undefined) row.participant_user_ids = meeting.participantUserIds;
  if (meeting.participantCompanyIds !== undefined) row.participant_company_ids = meeting.participantCompanyIds;
  if (meeting.accessType !== undefined) row.access_type = meeting.accessType;
  if (meeting.scheduledAt !== undefined) row.scheduled_at = meeting.scheduledAt;
  if (meeting.duration !== undefined) row.duration = meeting.duration;
  if (meeting.jitsiRoomName !== undefined) row.jitsi_room_name = meeting.jitsiRoomName;
  if (meeting.status !== undefined) row.status = meeting.status;
  if (meeting.createdAt !== undefined) row.created_at = meeting.createdAt;
  if (meeting.updatedAt !== undefined) row.updated_at = meeting.updatedAt;
  if (meeting.startedAt !== undefined) row.started_at = meeting.startedAt || null;
  if (meeting.endedAt !== undefined) row.ended_at = meeting.endedAt || null;
  if (meeting.meetingRequestId !== undefined) row.meeting_request_id = meeting.meetingRequestId || null;

  return row;
}

/**
 * Create a new meeting
 * Note: id is optional - if not provided, database will generate it
 */
export async function createMeeting(meeting: Omit<Meeting, 'id'> & { id?: string }): Promise<Meeting> {
  const supabase = getServerSupabaseClient();
  const row = meetingToRow(meeting);

  const { data, error } = await supabase
    .from('meetings')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    throw new Error(`Failed to create meeting: ${error.message}`);
  }

  return rowToMeeting(data as MeetingRow);
}

/**
 * Get a meeting by ID
 */
export async function getMeeting(id: string): Promise<Meeting | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error getting meeting:', error);
    throw new Error(`Failed to get meeting: ${error.message}`);
  }

  return data ? rowToMeeting(data as MeetingRow) : null;
}

/**
 * Get all meetings for a specific user (either as host or participant)
 * Includes meetings assigned to the user's company when accessType is 'company'
 */
export async function getUserMeetings(userId: string): Promise<Meeting[]> {
  const supabase = getServerSupabaseClient();
  
  // Get user's database record to get their UUID and company_id
  const user = await getUserByClerkId(userId);
  if (!user) {
    // If user doesn't exist in database, return empty array
    return [];
  }

  const userUuid = user.id;
  const userCompanyId = user.company_id;

  // Query 1: User-specific meetings (host or participant)
  // Get meetings where user is host OR user is in participant list
  // We need to check both conditions separately because Supabase array queries can be tricky
  const { data: hostMeetings, error: hostError } = await supabase
    .from('meetings')
    .select('*')
    .eq('host_user_id', userUuid);

  // Query for meetings where user is in participant list
  // Fetch all meetings and filter in code to ensure we catch all matches
  const { data: allMeetingsForParticipant, error: participantError } = await supabase
    .from('meetings')
    .select('*');
  
  // Filter meetings where user is in participant list
  const participantMeetings = (allMeetingsForParticipant || []).filter((meeting: any) => {
    return Array.isArray(meeting.participant_user_ids) && 
           meeting.participant_user_ids.includes(userUuid);
  });
  
  if (participantError) {
    console.error('Error fetching meetings for participant filter:', participantError);
  }

  // Note: Public meetings are excluded for regular users - only superusers can see them
  // This is handled at the API/component level, not in the database query

  if (hostError) {
    console.error('Error getting user-specific meetings:', hostError);
    throw new Error(`Failed to get user meetings: ${hostError?.message}`);
  }
  
  // Log participant error but don't throw - we'll use the filtered results
  if (participantError) {
    console.error('Error fetching meetings for participant filter (continuing with empty array):', participantError);
  }

  // Combine and deduplicate (excluding public meetings - they're filtered at component level)
  const userMeetingsMap = new Map<string, MeetingRow>();
  (hostMeetings || []).forEach((m: any) => userMeetingsMap.set(m.id, m as MeetingRow));
  (participantMeetings || []).forEach((m: any) => userMeetingsMap.set(m.id, m as MeetingRow));
  const userMeetings = Array.from(userMeetingsMap.values());

  // Query 2: Company-based meetings (if user has a company)
  let companyMeetings: MeetingRow[] = [];
  if (userCompanyId) {
    const { data: companyData, error: companyError } = await supabase
      .from('meetings')
      .select('*')
      .eq('access_type', 'company')
      .contains('participant_company_ids', [userCompanyId]);

    if (companyError) {
      console.error('Error getting company meetings:', companyError);
      // Don't throw - just log the error and continue with user meetings
    } else {
      companyMeetings = (companyData || []) as MeetingRow[];
    }
  }

  // Combine and deduplicate meetings by ID
  const allMeetingsMap = new Map<string, MeetingRow>();
  
  (userMeetings || []).forEach((meeting) => {
    allMeetingsMap.set(meeting.id, meeting as MeetingRow);
  });
  
  companyMeetings.forEach((meeting) => {
    if (!allMeetingsMap.has(meeting.id)) {
      allMeetingsMap.set(meeting.id, meeting);
    }
  });

  // Convert to Meeting objects and sort by scheduled_at
  const meetings = Array.from(allMeetingsMap.values())
    .map((row) => rowToMeeting(row))
    .sort((a, b) => {
      const dateA = new Date(a.scheduledAt).getTime();
      const dateB = new Date(b.scheduledAt).getTime();
      return dateB - dateA; // Descending order (most recent first)
    });

  return meetings;
}

/**
 * Get upcoming meetings for a user
 * Shows meetings where the join window is still valid:
 * - Meetings starting within 2 hours or less
 * - Meetings that started up to 3 hours ago
 * Includes meetings assigned to the user's company when accessType is 'company'
 */
export async function getUpcomingMeetings(userId: string): Promise<Meeting[]> {
  const supabase = getServerSupabaseClient();
  const now = new Date();
  // Calculate the cutoff time: meetings that started more than 3 hours ago won't be shown
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  // Get user's database record to get their UUID and company_id
  const user = await getUserByClerkId(userId);
  if (!user) {
    // If user doesn't exist in database, return empty array
    return [];
  }

  const userUuid = user.id;
  const userCompanyId = user.company_id;

  // Query 1: User-specific meetings (host or participant) with status filter
  // Get meetings where user is host OR user is in participant list
  const { data: hostMeetings, error: hostError } = await supabase
    .from('meetings')
    .select('*')
    .eq('host_user_id', userUuid)
    .in('status', ['scheduled', 'in-progress']);

  // Query for meetings where user is in participant list
  // Fetch all meetings with the right status and filter in code
  const { data: allMeetingsForParticipant, error: participantError } = await supabase
    .from('meetings')
    .select('*')
    .in('status', ['scheduled', 'in-progress']);
  
  // Filter meetings where user is in participant list
  const participantMeetings = (allMeetingsForParticipant || []).filter((meeting: any) => {
    return Array.isArray(meeting.participant_user_ids) && 
           meeting.participant_user_ids.includes(userUuid);
  });
  
  if (participantError) {
    console.error('Error fetching meetings for participant filter:', participantError);
  }
  
  const finalParticipantMeetings = participantMeetings;

  // Note: Public meetings are excluded for regular users - only superusers can see them
  // This is handled at the API/component level, not in the database query

  if (hostError || participantError) {
    console.error('Error getting user-specific upcoming meetings:', hostError || participantError);
    throw new Error(`Failed to get upcoming meetings: ${(hostError || participantError)?.message}`);
  }

  // Combine and deduplicate (excluding public meetings - they're filtered at component level)
  const userMeetingsMap = new Map<string, MeetingRow>();
  (hostMeetings || []).forEach((m: any) => userMeetingsMap.set(m.id, m as MeetingRow));
  (finalParticipantMeetings || []).forEach((m: any) => userMeetingsMap.set(m.id, m as MeetingRow));
  const userMeetings = Array.from(userMeetingsMap.values());

  // Query 2: Company-based meetings (if user has a company) with status filter
  let companyMeetings: MeetingRow[] = [];
  if (userCompanyId) {
    const { data: companyData, error: companyError } = await supabase
      .from('meetings')
      .select('*')
      .eq('access_type', 'company')
      .contains('participant_company_ids', [userCompanyId])
      .in('status', ['scheduled', 'in-progress']);

    if (companyError) {
      console.error('Error getting company upcoming meetings:', companyError);
      // Don't throw - just log the error and continue with user meetings
    } else {
      companyMeetings = (companyData || []) as MeetingRow[];
    }
  }

  // Combine and deduplicate meetings by ID
  const allMeetingsMap = new Map<string, MeetingRow>();
  
  (userMeetings || []).forEach((meeting) => {
    allMeetingsMap.set(meeting.id, meeting as MeetingRow);
  });
  
  companyMeetings.forEach((meeting) => {
    if (!allMeetingsMap.has(meeting.id)) {
      allMeetingsMap.set(meeting.id, meeting);
    }
  });

  // Convert to Meeting objects, filter by join window, and sort
  const filteredMeetings = Array.from(allMeetingsMap.values())
    .map((row) => rowToMeeting(row))
    .filter((meeting) => {
      const scheduledDate = new Date(meeting.scheduledAt);
      const joinWindowEnd = new Date(scheduledDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after scheduled time

      // Only show meetings where the join window hasn't ended yet
      return now <= joinWindowEnd;
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduledAt).getTime();
      const dateB = new Date(b.scheduledAt).getTime();
      return dateA - dateB; // Ascending order (soonest first)
    });

  return filteredMeetings;
}

/**
 * Get all meetings (admin only)
 */
export async function getAllMeetingsList(): Promise<Meeting[]> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('Error getting all meetings:', error);
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }

    return (data || []).map((row) => rowToMeeting(row as MeetingRow));
  } catch (error) {
    console.error('Error in getAllMeetingsList:', error);
    // Return empty array on any error to allow graceful degradation
    return [];
  }
}

/**
 * Update meeting status
 */
export async function updateMeetingStatus(
  id: string,
  status: Meeting['status'],
  additionalData?: { startedAt?: string; endedAt?: string }
): Promise<Meeting | null> {
  const supabase = getServerSupabaseClient();
  const updates: Partial<MeetingRow> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (additionalData?.startedAt) {
    updates.started_at = additionalData.startedAt;
  }
  if (additionalData?.endedAt) {
    updates.ended_at = additionalData.endedAt;
  }

  const { data, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting status:', error);
    return null;
  }

  return data ? rowToMeeting(data as MeetingRow) : null;
}

/**
 * Update a meeting
 */
export async function updateMeeting(
  id: string,
  updates: Partial<Omit<Meeting, 'id' | 'createdAt'>>
): Promise<Meeting | null> {
  const supabase = getServerSupabaseClient();
  const row = meetingToRow(updates);
  row.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('meetings')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting:', error);
    return null;
  }

  return data ? rowToMeeting(data as MeetingRow) : null;
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(id: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting meeting:', error);
    return false;
  }

  return true;
}

/**
 * Generate a unique Jitsi room name
 */
export function generateJitsiRoomName(meetingId: string): string {
  return `vercatryx-${meetingId}`;
}

/**
 * Upload a document to a meeting
 */
export async function uploadMeetingDocument(
  meetingId: string,
  file: File,
  uploadedBy: string // Clerk user ID
): Promise<MeetingDocument> {
  const supabase = getServerSupabaseClient();
  
  // Get the meeting to check if it exists
  const meeting = await getMeeting(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Generate unique file key
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `meeting-documents/${meetingId}/${timestamp}-${sanitizedFilename}`;

  // Convert File to Buffer
  const fileBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: file.type,
    ContentLength: file.size,
    Metadata: {
      'original-filename': file.name.replace(/[^a-zA-Z0-9.-]/g, '_'),
      'meeting-id': meetingId,
      'uploaded-by': uploadedBy,
    },
  });

  await r2Client.send(command);

  // Construct public URL
  const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`;

  // Create document object
  const document: MeetingDocument = {
    id: `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    url: publicUrl,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  };

  // Get current documents array
  const currentDocuments = meeting.documents || [];
  const updatedDocuments = [...currentDocuments, document];

  // Update meeting with new document
  const { error } = await supabase
    .from('meetings')
    .update({ 
      documents: updatedDocuments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId);

  if (error) {
    console.error('Error updating meeting with document:', error);
    // Try to delete the uploaded file if database update fails
    try {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileKey,
      }));
    } catch (deleteError) {
      console.error('Error deleting file after failed database update:', deleteError);
    }
    throw new Error(`Failed to save document: ${error.message}`);
  }

  return document;
}

/**
 * Delete a document from a meeting
 */
export async function deleteMeetingDocument(
  meetingId: string,
  documentId: string
): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  
  // Get the meeting
  const meeting = await getMeeting(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Find the document to delete
  const documents = meeting.documents || [];
  const documentToDelete = documents.find((doc: MeetingDocument) => doc.id === documentId);
  
  if (!documentToDelete) {
    throw new Error('Document not found');
  }

  // Extract file key from URL
  const url = new URL(documentToDelete.url);
  const fileKey = url.pathname.substring(1); // Remove leading slash

  // Delete from R2
  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    }));
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    // Continue with database update even if R2 delete fails
  }

  // Remove document from array
  const updatedDocuments = documents.filter((doc: MeetingDocument) => doc.id !== documentId);

  // Update meeting
  const { error } = await supabase
    .from('meetings')
    .update({ 
      documents: updatedDocuments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId);

  if (error) {
    console.error('Error updating meeting after document deletion:', error);
    return false;
  }

  return true;
}
