/**
 * User management functions for company-based system
 */

import { createClient } from '@supabase/supabase-js';
import type {
  User,
  UserWithCompany,
  CreateUserInput,
  UpdateUserInput,
  UserDisplayInfo,
} from '@/types/company';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get user by Clerk user ID
 */
export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    console.error('Error fetching user by Clerk ID:', error);
    return null;
  }

  return data;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

/**
 * Get user with company details
 */
export async function getUserWithCompany(userId: string): Promise<UserWithCompany | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      company:companies(*)
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user with company:', error);
    return null;
  }

  return data as unknown as UserWithCompany;
}

/**
 * Get all users in a company
 */
export async function getUsersByCompany(companyId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching company users:', error);
    throw new Error('Failed to fetch company users');
  }

  return data || [];
}

/**
 * Get all users (super admin only)
 */
export async function getAllUsers(): Promise<UserWithCompany[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      company:companies(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users:', error);
    throw new Error('Failed to fetch users');
  }

  return data as unknown as UserWithCompany[];
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }

  return data;
}

/**
 * Update a user
 */
export async function updateUser(userId: string, input: UpdateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(input)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }

  return data;
}

/**
 * Delete a user (soft delete by setting is_active to false)
 */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

/**
 * Hard delete a user (permanently remove)
 */
export async function hardDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error hard deleting user:', error);
    throw new Error('Failed to hard delete user');
  }
}

/**
 * Get user display info (formatted name or email)
 */
export function getUserDisplayInfo(user: User): UserDisplayInfo {
  const name = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.first_name || user.last_name || user.email;

  return {
    id: user.id,
    name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Get multiple users' display info
 */
export async function getUsersDisplayInfo(userIds: string[]): Promise<UserDisplayInfo[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching users display info:', error);
    return [];
  }

  return (data || []).map(getUserDisplayInfo);
}

/**
 * Check if user has admin role in their company
 */
export async function isCompanyAdmin(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.role === 'admin';
}

/**
 * Check if user belongs to a specific company
 */
export async function userBelongsToCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.company_id === companyId;
}
