/**
 * Company management functions
 */

import { createClient } from '@supabase/supabase-js';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '@/types/company';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get all companies (super admin only)
 */
export async function getAllCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching companies:', error);
    throw new Error('Failed to fetch companies');
  }

  return data || [];
}

/**
 * Get a single company by ID
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching company:', error);
    return null;
  }

  return data;
}

/**
 * Create a new company
 */
export async function createCompany(input: CreateCompanyInput): Promise<Company> {
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
}
