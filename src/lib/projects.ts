import { put, list } from '@vercel/blob';

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
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not configured. Projects will not be persisted.');
      return {};
    }

    const { blobs } = await list({ prefix: BLOB_FILENAME });

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
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured. Cannot save projects.');
    }

    console.log('Saving projects to blob:', JSON.stringify(projects, null, 2));

    const result = await put(BLOB_FILENAME, JSON.stringify(projects, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log('Successfully saved projects to blob:', result.url);
  } catch (error) {
    console.error('Error writing projects to blob:', error);
    throw error;
  }
}

/**
 * Get all projects for a specific user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  const allProjects = await getAllProjects();
  return allProjects[userId] || [];
}

/**
 * Get all users with their projects (for admin)
 */
export async function getAllUserProjects(): Promise<ProjectStore> {
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
