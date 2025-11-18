import { put, list, del } from '@vercel/blob';

const isDevelopment = process.env.NODE_ENV === 'development';
const USE_FS = isDevelopment || !process.env.BLOB_READ_WRITE_TOKEN;

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

function getBlobFilename(projectId: string) {
  return `chat-${projectId}.json`;
}

/**
 * Get all chat messages for a project
 */
export async function getProjectMessages(projectId: string): Promise<ChatMessage[]> {
  if (USE_FS) {
    // In development, we can mock this or use a local file if needed
    console.warn('Chat FS implementation is not available. Returning empty array.');
    return [];
  }

  try {
    const blobFilename = getBlobFilename(projectId);
    const { blobs } = await list({ prefix: blobFilename });

    if (blobs.length === 0) {
      return [];
    }

    const blob = blobs[0];
    const response = await fetch(blob.url);

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    return JSON.parse(text) as ChatMessage[];
  } catch (error) {
    console.error('Error reading chat messages from blob:', error);
    return [];
  }
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

  if (!USE_FS) {
    const blobFilename = getBlobFilename(projectId);
    await put(blobFilename, JSON.stringify(messages, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  }

  return newMessage;
}
