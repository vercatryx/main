import { put, list, del } from '@vercel/blob';

const isDevelopment = process.env.NODE_ENV === 'development';
const USE_FS = !process.env.BLOB_READ_WRITE_TOKEN;

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

function getBlobFilename(projectId: string, version?: number) {
  if (version) {
    return `chat-${projectId}-v${version}.json`;
  }
  return `chat-${projectId}.json`;
}

function getBaseBlobPrefix(projectId: string) {
  return `chat-${projectId}`;
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
    const prefix = getBaseBlobPrefix(projectId);

    // List all chat blobs for this project, sorted by upload time (newest first)
    const { blobs } = await list({
      prefix: prefix,
      limit: 10,
      mode: 'expanded'
    });

    if (blobs.length === 0) {
      console.log('No messages found for project:', projectId);
      return [];
    }

    // Get the most recently uploaded blob
    const sortedBlobs = blobs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    const latestBlob = sortedBlobs[0];

    console.log('Fetching latest messages from:', latestBlob.pathname, 'uploaded at:', latestBlob.uploadedAt);

    // Fetch with strong cache-busting
    const response = await fetch(latestBlob.url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch messages, status:', response.status);
      return [];
    }

    const text = await response.text();
    const messages = JSON.parse(text) as ChatMessage[];
    console.log('Loaded', messages.length, 'messages for project:', projectId);
    return messages;
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
    // Use updateProjectMessages to ensure proper versioning
    await updateProjectMessages(projectId, messages);
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
    console.warn('Cannot update messages in FS mode (no BLOB_READ_WRITE_TOKEN)');
    return;
  }

  try {
    // Delete ALL old chat blobs for this project
    const prefix = getBaseBlobPrefix(projectId);
    const { blobs } = await list({ prefix });

    console.log('Deleting', blobs.length, 'old chat blobs for project:', projectId);
    for (const blob of blobs) {
      try {
        await del(blob.url);
        console.log('Deleted old blob:', blob.pathname);
      } catch (delError) {
        console.error('Error deleting blob:', blob.pathname, delError);
      }
    }

    // Create new blob with a version timestamp to ensure unique URL
    const version = Date.now();
    const blobFilename = getBlobFilename(projectId, version);

    const result = await put(blobFilename, JSON.stringify(messages, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log('Messages saved to new blob:', blobFilename, 'URL:', result.url);
  } catch (error) {
    console.error('Error updating messages:', error);
    throw error;
  }
}

/**
 * Upload a file to Vercel Blob for chat attachments
 */
export async function uploadChatFile(
  projectId: string,
  messageId: string,
  file: File
): Promise<ChatAttachment> {
  if (USE_FS) {
    throw new Error('File uploads not available in development without BLOB_READ_WRITE_TOKEN');
  }

  // Validate file size (25MB for images, 50MB for files)
  const maxSize = file.type.startsWith('image/') ? 25 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }

  // Upload to Vercel Blob
  const filename = `chat-files/${projectId}/${messageId}/${file.name}`;
  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  // Determine attachment type
  let type: 'image' | 'file' | 'voice' = 'file';
  if (file.type.startsWith('image/')) {
    type = 'image';
  } else if (file.type.startsWith('audio/')) {
    type = 'voice';
  }

  return {
    type,
    url: blob.url,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  };
}
