import { getServerSupabaseClient } from './supabase';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './r2';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ChatAttachment {
  type: 'image' | 'file' | 'voice';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number; // Duration in seconds for voice notes
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  attachments?: ChatAttachment[];
}

// Database row type
type ChatMessageRow = {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments: any; // JSONB
  created_at: string;
  updated_at: string;
};

/**
 * Convert ChatMessage to database row
 * Note: We're storing timestamp as created_at, and userId/userName in the content
 */
function messageToRow(projectId: string, message: ChatMessage): Partial<ChatMessageRow> {
  return {
    id: message.id,
    project_id: projectId,
    role: 'user', // Default to user, can be changed based on your logic
    content: JSON.stringify({
      userId: message.userId,
      userName: message.userName,
      message: message.message,
      timestamp: message.timestamp,
    }),
    attachments: message.attachments || [],
  };
}

/**
 * Convert database row to ChatMessage
 */
export function rowToMessage(row: ChatMessageRow): ChatMessage {
  const content = JSON.parse(row.content);
  return {
    id: row.id,
    userId: content.userId,
    userName: content.userName,
    message: content.message,
    timestamp: content.timestamp || new Date(row.created_at).getTime(),
    attachments: row.attachments as ChatAttachment[],
  };
}

/**
 * Get all chat messages for a project (server-side)
 */
export async function getProjectMessages(projectId: string): Promise<ChatMessage[]> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }

  return (data || []).map(rowToMessage);
}

/**
 * Get all chat messages for a project (client-side)
 * Use this in React components with a client Supabase instance
 */
export async function getProjectMessagesClient(
  client: SupabaseClient,
  projectId: string
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }

  return (data || []).map(rowToMessage);
}

/**
 * Add a message to a project's chat
 */
export async function addMessage(
  projectId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<ChatMessage> {
  const supabase = getServerSupabaseClient();
  const timestamp = Date.now();

  // Let the database generate the UUID
  const row = {
    project_id: projectId,
    role: 'user' as const,
    content: JSON.stringify({
      userId: message.userId,
      userName: message.userName,
      message: message.message,
      timestamp,
    }),
    attachments: message.attachments || [],
  };

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    throw new Error(`Failed to add message: ${error.message}`);
  }

  return rowToMessage(data as ChatMessageRow);
}

/**
 * Update all messages for a project (used for editing/deleting)
 * Note: This replaces all messages - use with caution
 */
export async function updateProjectMessages(
  projectId: string,
  messages: ChatMessage[]
): Promise<void> {
  const supabase = getServerSupabaseClient();
  // Delete all existing messages for the project
  const { error: deleteError } = await supabase
    .from('chat_messages')
    .delete()
    .eq('project_id', projectId);

  if (deleteError) {
    console.error('Error deleting messages:', deleteError);
    throw new Error(`Failed to delete messages: ${deleteError.message}`);
  }

  // Insert new messages
  if (messages.length > 0) {
    // Let the database generate UUIDs for new messages
    const rows = messages.map(msg => ({
      project_id: projectId,
      role: 'user' as const,
      content: JSON.stringify({
        userId: msg.userId,
        userName: msg.userName,
        message: msg.message,
        timestamp: msg.timestamp,
      }),
      attachments: msg.attachments || [],
    }));

    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert(rows);

    if (insertError) {
      console.error('Error inserting messages:', insertError);
      throw new Error(`Failed to insert messages: ${insertError.message}`);
    }
  }
}

/**
 * Delete a specific message
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    return false;
  }

  return true;
}

/**
 * Sanitize filename for use in HTTP headers (S3 metadata)
 * Uses URL-safe base64 encoding to ensure the value is safe for HTTP headers
 * The original filename is preserved in the ChatAttachment object
 */
function sanitizeFilenameForHeader(filename: string): string {
  // Encode the filename as URL-safe base64 (base64url) to ensure it's safe for HTTP headers
  // Base64url uses A-Z, a-z, 0-9, -, _ (no padding, no + or /)
  const base64 = Buffer.from(filename, 'utf-8').toString('base64');
  // Convert standard base64 to URL-safe base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding
}

/**
 * Upload a file to Cloudflare R2 for chat attachments
 */
export async function uploadChatFile(
  projectId: string,
  messageId: string,
  file: File
): Promise<ChatAttachment> {
  // Generate unique file key with timestamp to prevent collisions
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `chat-files/${projectId}/${messageId}/${timestamp}-${sanitizedFilename}`;

  // Convert File to Buffer
  const fileBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  // Determine attachment type based on file type and name
  let attachmentType: 'image' | 'file' | 'voice' = 'file';
  if (file.type.startsWith('image/')) {
    attachmentType = 'image';
  } else if (file.type.startsWith('audio/') || file.name.startsWith('voice-')) {
    attachmentType = 'voice';
  }

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: file.type,
    ContentLength: file.size,
    Metadata: {
      'original-filename': sanitizeFilenameForHeader(file.name),
      'project-id': projectId,
      'message-id': messageId,
      'attachment-type': attachmentType,
    },
  });

  await r2Client.send(command);

  // Construct public URL
  const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`;

  const attachment: ChatAttachment = {
    type: attachmentType,
    url: publicUrl,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  };

  return attachment;
}

/**
 * Delete a chat file from R2
 */
export async function deleteChatFile(fileUrl: string): Promise<void> {
  try {
    // Extract the file key from the public URL
    // URL format: https://pub-xxxxx.r2.dev/chat-files/projectId/messageId/filename
    // or: https://files.vercatryx.com/chat-files/projectId/messageId/filename
    const urlParts = fileUrl.split('/');
    const keyIndex = urlParts.indexOf('chat-files');

    if (keyIndex === -1) {
      console.error('Invalid file URL format:', fileUrl);
      return;
    }

    // Reconstruct the key from the URL
    const fileKey = urlParts.slice(keyIndex).join('/');

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    await r2Client.send(command);
    console.log('File deleted from R2:', fileKey);
  } catch (error) {
    console.error('Error deleting chat file from R2:', error);
    throw error;
  }
}
