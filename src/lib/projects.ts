import { getServerSupabaseClient } from './supabase';

export interface Project {
  id: string;
  companyId: string; // Company that owns this project
  userId?: string; // Legacy field - will be deprecated
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
  company_id: string;
  user_id?: string; // Legacy field
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
    companyId: row.company_id,
    userId: row.user_id, // Legacy field
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
  if (project.companyId !== undefined) row.company_id = project.companyId;
  if (project.userId !== undefined) row.user_id = project.userId; // Legacy field
  if (project.title !== undefined) row.title = project.title;
  if (project.url !== undefined) row.url = project.url;
  if (project.description !== undefined) row.description = project.description || null;
  if (project.createdAt !== undefined) row.created_at = project.createdAt;
  if (project.updatedAt !== undefined) row.updated_at = project.updatedAt;

  return row;
}

/**
 * Get all projects for a specific company
 */
export async function getCompanyProjects(companyId: string): Promise<Project[]> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map(rowToProject);
  } catch (error) {
    return [];
  }
}

/**
 * Get all projects for a specific user (LEGACY - kept for backward compatibility)
 * @deprecated Use getCompanyProjects instead
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map(rowToProject);
  } catch (error) {
    return [];
  }
}

/**
 * Get all users with their projects (for admin)
 */
export async function getAllUserProjects(): Promise<ProjectStore> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {};
    }

    // Group projects by user ID
    const projectStore: ProjectStore = {};
    (data || []).forEach((row) => {
      const project = rowToProject(row as ProjectRow);
      if (project.userId) {
        if (!projectStore[project.userId]) {
          projectStore[project.userId] = [];
        }
        projectStore[project.userId].push(project);
      }
    });

    return projectStore;
  } catch (error) {
    return {};
  }
}

/**
 * Add a project for a company
 */
export async function addProject(
  companyId: string,
  title: string,
  url: string,
  description?: string
): Promise<Project> {
  const newProject: Project = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    companyId,
    title,
    url,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const row = projectToRow(newProject);

  const supabase = getServerSupabaseClient();
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
  projectId: string,
  updates: { title?: string; url?: string; description?: string; companyId?: string }
): Promise<Project | null> {
  const row = projectToRow({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .update(row)
    .eq('id', projectId)
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
export async function deleteProject(projectId: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }

  return true;
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  return data ? rowToProject(data as ProjectRow) : null;
}
