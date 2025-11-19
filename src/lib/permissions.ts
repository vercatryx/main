/**
 * Permission checking and authorization helpers
 */

import { auth, clerkClient } from '@clerk/nextjs/server';
import { getUserByClerkId } from './users';
import type { User } from '@/types/company';

/**
 * Check if current user is a super admin (via Clerk role)
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.publicMetadata?.role === 'superuser';
}

/**
 * Get current authenticated user from database
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  return await getUserByClerkId(userId);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized - user not found');
  }
  return user;
}

/**
 * Require super admin - throws if not super admin
 */
export async function requireSuperAdmin(): Promise<void> {
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    throw new Error('Forbidden - super admin access required');
  }
}

/**
 * Require company admin - throws if not company admin
 */
export async function requireCompanyAdmin(companyId?: string): Promise<User> {
  const user = await requireAuth();

  // Super admins can access everything
  const superAdmin = await isSuperAdmin();
  if (superAdmin) {
    return user;
  }

  // Check if user is admin in their company
  if (user.role !== 'admin') {
    throw new Error('Forbidden - company admin access required');
  }

  // If specific company ID provided, verify user belongs to it
  if (companyId && user.company_id !== companyId) {
    throw new Error('Forbidden - access to this company denied');
  }

  return user;
}

/**
 * Require access to a specific company - throws if no access
 */
export async function requireCompanyAccess(companyId: string): Promise<User> {
  const user = await requireAuth();

  // Super admins can access all companies
  const superAdmin = await isSuperAdmin();
  if (superAdmin) {
    return user;
  }

  // Regular users can only access their own company
  if (user.company_id !== companyId) {
    throw new Error('Forbidden - access to this company denied');
  }

  return user;
}

/**
 * Check if user can manage another user
 * (super admin can manage all, company admin can manage their company's users)
 */
export async function canManageUser(targetUserId: string): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;

  // Super admins can manage all users
  const superAdmin = await isSuperAdmin();
  if (superAdmin) return true;

  // Company admins can manage users in their company
  if (currentUser.role === 'admin') {
    const { getUserById } = await import('./users');
    const targetUser = await getUserById(targetUserId);
    return targetUser?.company_id === currentUser.company_id;
  }

  return false;
}

/**
 * Check if user can manage a project
 */
export async function canManageProject(projectCompanyId: string): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;

  // Super admins can manage all projects
  const superAdmin = await isSuperAdmin();
  if (superAdmin) return true;

  // Company admins can manage their company's projects
  if (currentUser.role === 'admin' && currentUser.company_id === projectCompanyId) {
    return true;
  }

  return false;
}

/**
 * Get user's effective permissions
 */
export async function getUserPermissions() {
  const currentUser = await getCurrentUser();
  const superAdmin = await isSuperAdmin();

  return {
    isSuperAdmin: superAdmin,
    isCompanyAdmin: currentUser?.role === 'admin',
    companyId: currentUser?.company_id || null,
    canManageCompanies: superAdmin,
    canManageUsers: superAdmin || currentUser?.role === 'admin',
    canManageProjects: superAdmin || currentUser?.role === 'admin',
    canManageMeetings: superAdmin || currentUser?.role === 'admin',
  };
}
