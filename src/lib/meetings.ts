import { getServerSupabaseClient } from './supabase';

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
  };
}

/**
 * Convert Meeting object to database row (camelCase to snake_case)
 */
function meetingToRow(meeting: Partial<Meeting>): Partial<MeetingRow> {
  const row: Partial<MeetingRow> = {};

  if (meeting.id !== undefined) row.id = meeting.id;
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

  return row;
}

/**
 * Create a new meeting
 */
export async function createMeeting(meeting: Meeting): Promise<Meeting> {
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
 */
export async function getUserMeetings(userId: string): Promise<Meeting[]> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .or(`host_user_id.eq.${userId},participant_user_ids.cs.{${userId}}`)
    .order('scheduled_at', { ascending: false });

  if (error) {
    console.error('Error getting user meetings:', error);
    throw new Error(`Failed to get user meetings: ${error.message}`);
  }

  return (data || []).map((row) => rowToMeeting(row as MeetingRow));
}

/**
 * Get upcoming meetings for a user
 * Shows meetings where the join window is still valid:
 * - Meetings starting within 30 minutes or less
 * - Meetings that started up to 3 hours ago
 */
export async function getUpcomingMeetings(userId: string): Promise<Meeting[]> {
  const supabase = getServerSupabaseClient();
  const now = new Date();
  // Calculate the cutoff time: meetings that started more than 3 hours ago won't be shown
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .or(`host_user_id.eq.${userId},participant_user_ids.cs.{${userId}}`)
    .in('status', ['scheduled', 'in-progress'])
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error getting upcoming meetings:', error);
    throw new Error(`Failed to get upcoming meetings: ${error.message}`);
  }

  // Filter meetings based on the join window (30 min before to 3 hours after)
  const filteredMeetings = (data || [])
    .map((row) => rowToMeeting(row as MeetingRow))
    .filter((meeting) => {
      const scheduledDate = new Date(meeting.scheduledAt);
      const joinWindowEnd = new Date(scheduledDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after scheduled time

      // Only show meetings where the join window hasn't ended yet
      return now <= joinWindowEnd;
    });

  return filteredMeetings;
}

/**
 * Get all meetings (admin only)
 */
export async function getAllMeetingsList(): Promise<Meeting[]> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('scheduled_at', { ascending: false });

  if (error) {
    console.error('Error getting all meetings:', error);
    throw new Error(`Failed to get all meetings: ${error.message}`);
  }

  return (data || []).map((row) => rowToMeeting(row as MeetingRow));
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
