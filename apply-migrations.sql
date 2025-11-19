-- Apply migrations to Supabase database
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Migration 1: Create companies and users tables
-- Migration: Create companies and users tables for multi-tenant architecture
-- This migration adds company-based organization to the system

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (replacing reliance on Clerk alone)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    clerk_user_id TEXT UNIQUE, -- Links to Clerk for auth, nullable for invited users who haven't signed up yet
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add company_id to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create index for faster company-based queries
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update chat_messages to use new user_id instead of Clerk ID
-- First, add the new column
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster user-based queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Add company_id to meetings table
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Update meetings to use new user IDs
ALTER TABLE meetings
RENAME COLUMN hostUserId TO host_user_id_old;

ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE meetings
RENAME COLUMN participantUserIds TO participant_user_ids_old;

ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS participant_user_ids UUID[] DEFAULT '{}';

-- Create indexes for meetings
CREATE INDEX IF NOT EXISTS idx_meetings_company_id ON meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_host_user_id ON meetings(host_user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE companies IS 'Companies in the multi-tenant system. Each company has users and projects.';
COMMENT ON TABLE users IS 'Users belonging to companies. Links to Clerk for authentication.';
COMMENT ON COLUMN users.clerk_user_id IS 'Links to Clerk user ID for authentication. Nullable to allow inviting users before they sign up.';
COMMENT ON COLUMN users.role IS 'Company role: admin (can manage company) or member (can access projects)';
COMMENT ON COLUMN projects.company_id IS 'Foreign key to companies table. All projects belong to a company.';
COMMENT ON COLUMN meetings.company_id IS 'Foreign key to companies table. All meetings belong to a company.';
