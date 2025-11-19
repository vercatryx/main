/**
 * Company management functions
 */

import { getServerSupabaseClient } from './supabase';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '@/types/company';

/**
 * Get all companies (super admin only)
 */
export async function getAllCompanies(): Promise<Company[]> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');

    if (error) {
      // Silently handle database errors - return empty array if can't connect
      return [];
    }

    return data || [];
  } catch (error) {
    // Silently handle any connection errors
    return [];
  }
}

/**
 * Get a single company by ID
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
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
 * Create a new company
 */
export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: input.name,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating company:', error);
    throw new Error('Failed to create company');
  }

  return data;
}

/**
 * Update a company
 */
export async function updateCompany(
  id: string,
  input: UpdateCompanyInput
): Promise<Company> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('companies')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating company:', error);
    throw new Error('Failed to update company');
  }

  return data;
}

/**
 * Delete a company (and all associated data via CASCADE)
 */
export async function deleteCompany(id: string): Promise<void> {
  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting company:', error);
    throw new Error('Failed to delete company');
  }
}

/**
 * Get company statistics
 */
export async function getCompanyStats(companyId: string) {
  try {
    const supabase = getServerSupabaseClient();
    const [usersCount, projectsCount, meetingsCount] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }).eq('company_id', companyId),
      supabase.from('projects').select('id', { count: 'exact' }).eq('company_id', companyId),
      supabase.from('meetings').select('id', { count: 'exact' }).eq('company_id', companyId),
    ]);

    return {
      users: usersCount.count || 0,
      projects: projectsCount.count || 0,
      meetings: meetingsCount.count || 0,
    };
  } catch (error) {
    return {
      users: 0,
      projects: 0,
      meetings: 0,
    };
  }
}
