import { put, list } from '@vercel/blob';
import * as fsProjects from './projects-fs';

// Use file system storage in development, blob in production
const isDevelopment = process.env.NODE_ENV === 'development';
const USE_FS = isDevelopment || !process.env.BLOB_READ_WRITE_TOKEN;

export interface Project {
  id: string;
  userId: string; // Clerk user ID
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStore {
  [userId: string]: Project[];
}

const BLOB_FILENAME = 'client-projects.json';

/**
 * Get all projects from blob storage
 */
async function getAllProjects(): Promise<ProjectStore> {
  console.log('=== GET ALL PROJECTS CALLED ===');

  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not configured. Projects will not be persisted.');
      return {};
    }

    console.log('Listing blobs with prefix:', BLOB_FILENAME);
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    console.log('Found blobs:', blobs.length);

    if (blobs.length === 0) {
      console.log('No projects blob found, returning empty store');
      return {};
    }

    // Sort by uploadedAt to get the most recent blob
    const sortedBlobs = blobs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    const blob = sortedBlobs[0];

    console.log(`Found ${blobs.length} blob(s), using most recent from:`, blob.uploadedAt);
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

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      console.log('Successfully read projects from blob:', JSON.stringify(data, null, 2));
      return data as ProjectStore;
    } catch (parseError) {
      console.error('Failed to parse blob JSON:', parseError);
      console.error('Blob content:', text.substring(0, 500));
      return {};
    }
  } catch (error) {
    console.error('Error reading projects from blob:', error);
    return {};
  }
}

/**
 * Save all projects to blob storage
 */
async function saveAllProjects(projects: ProjectStore): Promise<void> {
  console.log('=== SAVE ALL PROJECTS CALLED ===');
  console.log('Token configured:', !!process.env.BLOB_READ_WRITE_TOKEN);
  console.log('Token preview:', process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) + '...');
  console.log('Projects to save:', JSON.stringify(projects, null, 2));

  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured. Cannot save projects.');
    }

    console.log('Calling put() with filename:', BLOB_FILENAME);

    const result = await put(BLOB_FILENAME, JSON.stringify(projects, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log('✅ Successfully saved projects to blob!');
    console.log('Blob URL:', result.url);
    console.log('Blob pathname:', result.pathname);
  } catch (error) {
    console.error('❌ Error writing projects to blob:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get all projects for a specific user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  if (USE_FS) {
    console.log('[WRAPPER] Using file system storage');
    return fsProjects.getUserProjects(userId);
  }
  const allProjects = await getAllProjects();
  return allProjects[userId] || [];
}

/**
 * Get all users with their projects (for admin)
 */
export async function getAllUserProjects(): Promise<ProjectStore> {
  if (USE_FS) {
    console.log('[WRAPPER] Using file system storage');
    return fsProjects.getAllUserProjects();
  }
  return await getAllProjects();
}

/**
 * Add a project for a user
 */
export async function addProject(
  userId: string,
  title: string,
  url: string,
  description?: string
): Promise<Project> {
  if (USE_FS) {
    console.log('[WRAPPER] Using file system storage');
    return fsProjects.addProject(userId, title, url, description);
  }

  const allProjects = await getAllProjects();

  if (!allProjects[userId]) {
    allProjects[userId] = [];
  }

  const newProject: Project = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    title,
    url,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allProjects[userId].push(newProject);
  await saveAllProjects(allProjects);

  return newProject;
}

/**
 * Update a project
 */
export async function updateProject(
  userId: string,
  projectId: string,
  updates: { title?: string; url?: string; description?: string }
): Promise<Project | null> {
  if (USE_FS) {
    console.log('[WRAPPER] Using file system storage');
    return fsProjects.updateProject(userId, projectId, updates);
  }

  const allProjects = await getAllProjects();

  if (!allProjects[userId]) {
    return null;
  }

  const projectIndex = allProjects[userId].findIndex((p) => p.id === projectId);
  if (projectIndex === -1) {
    return null;
  }

  const project = allProjects[userId][projectIndex];
  allProjects[userId][projectIndex] = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveAllProjects(allProjects);
  return allProjects[userId][projectIndex];
}

/**
 * Delete a project
 */
export async function deleteProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  if (USE_FS) {
    console.log('[WRAPPER] Using file system storage');
    return fsProjects.deleteProject(userId, projectId);
  }

  const allProjects = await getAllProjects();

  if (!allProjects[userId]) {
    return false;
  }

  const initialLength = allProjects[userId].length;
  allProjects[userId] = allProjects[userId].filter((p) => p.id !== projectId);

  if (allProjects[userId].length === initialLength) {
    return false; // Project not found
  }

  // Remove user entry if no projects left
  if (allProjects[userId].length === 0) {
    delete allProjects[userId];
  }

  await saveAllProjects(allProjects);
  return true;
}
