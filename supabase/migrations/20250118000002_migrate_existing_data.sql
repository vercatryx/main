-- Migration: Migrate existing data to company-based structure
-- This migration creates a default company and migrates existing users and data

-- Create a default company for existing data
INSERT INTO companies (id, name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Default Company',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Note: Actual user migration will need to be done via a Node.js script
-- because we need to fetch Clerk users and create corresponding records.
-- This is just a placeholder migration that sets up the structure.

-- After users are created via the migration script, we'll need to:
-- 1. Update all existing projects to belong to the default company
-- 2. Update chat_messages to link to new user_id based on Clerk ID mapping
-- 3. Update meetings to link to new user IDs and company

-- These updates will be handled by the data migration script
-- For now, we'll add some helper comments

COMMENT ON TABLE companies IS 'Migration note: Default company created with ID 00000000-0000-0000-0000-000000000001 for existing data';
