import fs from 'fs';
import path from 'path';

export interface Project {
  id: string;
  userId: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStore {
  [userId: string]: Project[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Get all projects from file system (for local development)
 */
export async function getAllProjects(): Promise<ProjectStore> {
  try {
    ensureDataDir();

    if (!fs.existsSync(PROJECTS_FILE)) {
      console.log('[FS] No projects file found, returning empty store');
      return {};
    }

    const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    const projects = JSON.parse(data);
    console.log('[FS] Successfully read projects from file');
    return projects;
  } catch (error) {
    console.error('[FS] Error reading projects:', error);
    return {};
  }
}

/**
 * Save all projects to file system (for local development)
 */
export async function saveAllProjects(projects: ProjectStore): Promise<void> {
  try {
    ensureDataDir();

    console.log('[FS] Saving projects to file system');
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
    console.log('[FS] ✅ Successfully saved projects to file');
  } catch (error) {
    console.error('[FS] ❌ Error writing projects:', error);
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
