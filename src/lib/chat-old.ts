import { promises as fs } from 'fs';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const USE_FS = true;

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

function getChatFilePath(projectId: string) {
  return path.join(process.cwd(), 'data', 'chat', `${projectId}.json`);
}

/**
 * Get all chat messages for a project
 */
export async function getProjectMessages(projectId: string): Promise<ChatMessage[]> {
  if (USE_FS) {
    try {
      const filePath = getChatFilePath(projectId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If the file doesn't exist, return an empty array
      return [];
    }
  }
  // This should not be reached for now
  return [];
}

/**
 * Add a message to a project's chat
 */
export async function addMessage(
  projectId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<ChatMessage> {
  const messages = await getProjectMessages(projectId);

  const newMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  messages.push(newMessage);

  if (USE_FS) {
    const filePath = getChatFilePath(projectId);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
  }

  return newMessage;
}

/**
 * Update all messages for a project (used for editing/deleting)
 */
export async function updateProjectMessages(
  projectId: string,
  messages: ChatMessage[]
): Promise<void> {
  if (USE_FS) {
    const filePath = getChatFilePath(projectId);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
    return;
  }
  // This should not be reached for now
}

/**
 * Upload a file to Cloudinary for chat attachments
 */
export async function uploadChatFile(
  projectId: string,
  messageId: string,
  file: File
): Promise<ChatAttachment> {
  if (USE_FS) {
    // For local development, we can save the file to the public directory
    const fileBuffer = await file.arrayBuffer();
    const filePath = path.join(process.cwd(), 'public', 'chat-files', projectId, messageId, file.name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, Buffer.from(fileBuffer));

    let type: 'image' | 'file' | 'voice' = 'file';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('audio/')) {
      type = 'voice';
    }

    return {
      type,
      url: `/chat-files/${projectId}/${messageId}/${file.name}`,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    };
  }
  // This should not be reached for now
  throw new Error('Not implemented');
}
