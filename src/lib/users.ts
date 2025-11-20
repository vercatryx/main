/**
 * User management functions for company-based system
 */

import { currentUser } from '@clerk/nextjs/server';
import { getServerSupabaseClient } from './supabase';
import type {
  User,
  UserWithCompany,
  CreateUserInput,
  UpdateUserInput,
  UserDisplayInfo,
  UserRole,
} from '@/types/company';

/**
 * Get user by Clerk user ID
 */
export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 or 1 rows without error

    if (error) {
      // Silently handle database errors - return null if can't connect
      return null;
    }

    return data;
  } catch (error) {
    // Silently handle any connection errors
    return null;
  }
}

/**
 * Get user by email address
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      // Silently handle database errors - return null if can't connect
      return null;
    }

    return data;
  } catch (error) {
    // Silently handle any connection errors
    return null;
  }
}

/**
 * Get user by email and company ID
 */
export async function getUserByEmailAndCompany(email: string, companyId: string): Promise<User | null> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Get the currently logged-in user from the database
 */
export async function getCurrentUser(): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }
  return getUserByClerkId(clerkUser.id);
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 or 1 rows without error

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Get user with company details
 */
export async function getUserWithCompany(userId: string): Promise<UserWithCompany | null> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 or 1 rows without error

    if (error) {
      return null;
    }

    return data as unknown as UserWithCompany;
  } catch (error) {
    return null;
  }
}

/**
 * Get all users in a company
 */
export async function getUsersByCompany(companyId: string): Promise<User[]> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Get all users (super admin only)
 */
export async function getAllUsers(): Promise<UserWithCompany[]> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        company:companies(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }

    if (!data) {
      console.log('No users data returned');
      return [];
    }

    console.log(`getAllUsers returned ${data.length} users`);
    return data as unknown as UserWithCompany[];
  } catch (error) {
    console.error('Exception in getAllUsers:', error);
    return [];
  }
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update a user
 */
export async function updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .update(input)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }

  if (!data) {
    console.error('User not found:', userId);
    return null;
  }

  return data;
}

/**
 * Delete a user (hard delete - permanently removes from database)
 */
export async function deleteUser(userId: string): Promise<void> {
  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('users')
    .delete()
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
  const supabase = getServerSupabaseClient();
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
export function getUserDisplayInfo(user: {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: UserRole;
}): UserDisplayInfo {
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

  const supabase = getServerSupabaseClient();
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
