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
      return {};
    }

    const blob = blobs[0];
    const response = await fetch(blob.url);
    const data = await response.json();
    return data as ProjectStore;
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

    await put(BLOB_FILENAME, JSON.stringify(projects, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
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
