/**
 * Company-based multi-tenant system types
 */

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  company_id: string;
  clerk_user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithCompany extends User {
  company: Company;
}

export interface CreateUserInput {
  company_id: string;
  clerk_user_id?: string | null;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  role?: UserRole;
  is_active?: boolean;
}

export interface CreateCompanyInput {
  name: string;
}

export interface UpdateCompanyInput {
  name?: string;
}

// Helper type for displaying user names
export type UserDisplayInfo = {
  id: string;
  name: string; // Formatted as "First Last" or email if no name
  email: string;
  role: UserRole;
};
