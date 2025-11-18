import { supabase } from './supabase';
import { promises as fs } from 'fs';
import path from 'path';

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
function rowToMessage(row: ChatMessageRow): ChatMessage {
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
 * Get all chat messages for a project
 */
export async function getProjectMessages(projectId: string): Promise<ChatMessage[]> {
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
 * Add a message to a project's chat
 */
export async function addMessage(
  projectId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<ChatMessage> {
  const newMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  const row = messageToRow(projectId, newMessage);

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
    const rows = messages.map(msg => messageToRow(projectId, msg));

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
 * Upload a file to local storage for chat attachments
 * TODO: Replace with Supabase Storage or S3 later
 */
export async function uploadChatFile(
  projectId: string,
  messageId: string,
  file: File
): Promise<ChatAttachment> {
  // For now, save to local public directory
  const fileBuffer = await file.arrayBuffer();
  const filePath = path.join(process.cwd(), 'public', 'chat-files', projectId, messageId, file.name);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(fileBuffer));

  // Determine attachment type based on file type and name
  let attachmentType: 'image' | 'file' | 'voice' = 'file';
  if (file.type.startsWith('image/')) {
    attachmentType = 'image';
  } else if (file.type.startsWith('audio/') || file.name.startsWith('voice-')) {
    attachmentType = 'voice';
  }

  const attachment: ChatAttachment = {
    type: attachmentType,
    url: `/chat-files/${projectId}/${messageId}/${file.name}`,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  };

  return attachment;
}

/**
 * Delete a chat file
 */
export async function deleteChatFile(fileUrl: string): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), 'public', fileUrl);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting chat file:', error);
  }
}
