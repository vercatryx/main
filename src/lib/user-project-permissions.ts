/**
 * User Project Permissions
 * Manages which projects users have access to
 */

import { getServerSupabaseClient } from './supabase';

export interface UserProjectPermission {
  id: string;
  userId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all projects a user has permission to access
 */
export async function getUserProjectPermissions(userId: string): Promise<string[]> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_project_permissions')
    .select('project_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user project permissions:', error);
    return [];
  }

  return (data || []).map(row => row.project_id);
}

/**
 * Grant a user permission to access a project
 */
export async function grantProjectPermission(userId: string, projectId: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('user_project_permissions')
    .insert({
      user_id: userId,
      project_id: projectId,
    });

  if (error) {
    console.error('Error granting project permission:', error);
    return false;
  }

  return true;
}

/**
 * Revoke a user's permission to access a project
 */
export async function revokeProjectPermission(userId: string, projectId: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('user_project_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) {
    console.error('Error revoking project permission:', error);
    return false;
  }

  return true;
}

/**
 * Set all project permissions for a user (replaces existing)
 */
export async function setUserProjectPermissions(
  userId: string,
  projectIds: string[]
): Promise<boolean> {
  const supabase = getServerSupabaseClient();

  // Delete all existing permissions for this user
  await supabase
    .from('user_project_permissions')
    .delete()
    .eq('user_id', userId);

  // Insert new permissions
  if (projectIds.length > 0) {
    const { error } = await supabase
      .from('user_project_permissions')
      .insert(
        projectIds.map(projectId => ({
          user_id: userId,
          project_id: projectId,
        }))
      );

    if (error) {
      console.error('Error setting user project permissions:', error);
      return false;
    }
  }

  return true;
}

/**
 * Get all users who have permission to a specific project
 */
export async function getProjectUsers(projectId: string): Promise<string[]> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_project_permissions')
    .select('user_id')
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching project users:', error);
    return [];
  }

  return (data || []).map(row => row.user_id);
}

/**
 * Check if a user has permission to access a project
 */
export async function hasProjectPermission(userId: string, projectId: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_project_permissions')
    .select('id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    console.error('Error checking project permission:', error);
    return false;
  }

  return data !== null;
}

/**
 * Get projects a user can access (filtered by permissions)
 * Returns all company projects if user has all_projects_access or is admin, otherwise only assigned projects
 */
export async function getUserAccessibleProjects(userId: string, companyId: string): Promise<string[]> {
  const supabase = getServerSupabaseClient();

  // Check if user has all_projects_access or is admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('all_projects_access, role')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    console.error('Error checking user permissions:', userError);
    return [];
  }

  // If user has all projects access OR is an admin, return all company project IDs
  if (userData?.all_projects_access || userData?.role === 'admin') {
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', companyId);

    if (projectsError) {
      console.error('Error fetching company projects:', projectsError);
      return [];
    }

    return (projects || []).map(p => p.id);
  }

  // Otherwise, return only assigned projects
  return getUserProjectPermissions(userId);
}
