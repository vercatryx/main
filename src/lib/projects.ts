import { supabase } from './supabase';

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

// Database row type (snake_case from Supabase)
type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Convert database row to Project object (snake_case to camelCase)
 */
function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    url: row.url,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert Project object to database row (camelCase to snake_case)
 */
function projectToRow(project: Partial<Project>): Partial<ProjectRow> {
  const row: Partial<ProjectRow> = {};

  if (project.id !== undefined) row.id = project.id;
  if (project.userId !== undefined) row.user_id = project.userId;
  if (project.title !== undefined) row.title = project.title;
  if (project.url !== undefined) row.url = project.url;
  if (project.description !== undefined) row.description = project.description || null;
  if (project.createdAt !== undefined) row.created_at = project.createdAt;
  if (project.updatedAt !== undefined) row.updated_at = project.updatedAt;

  return row;
}

/**
 * Get all projects for a specific user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }

  return (data || []).map(rowToProject);
}

/**
 * Get all users with their projects (for admin)
 */
export async function getAllUserProjects(): Promise<ProjectStore> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all projects:', error);
    return {};
  }

  // Group projects by user ID
  const projectStore: ProjectStore = {};
  (data || []).forEach((row) => {
    const project = rowToProject(row as ProjectRow);
    if (!projectStore[project.userId]) {
      projectStore[project.userId] = [];
    }
    projectStore[project.userId].push(project);
  });

  return projectStore;
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
  const newProject: Project = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    title,
    url,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const row = projectToRow(newProject);

  const { data, error } = await supabase
    .from('projects')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Error adding project:', error);
    throw new Error(`Failed to add project: ${error.message}`);
  }

  return rowToProject(data as ProjectRow);
}

/**
 * Update a project
 */
export async function updateProject(
  userId: string,
  projectId: string,
  updates: { title?: string; url?: string; description?: string }
): Promise<Project | null> {
  const row = projectToRow({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from('projects')
    .update(row)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    return null;
  }

  return data ? rowToProject(data as ProjectRow) : null;
}

/**
 * Delete a project
 */
export async function deleteProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }

  return true;
}
