-- Add status field to users table
-- Run this in Supabase SQL Editor

-- Add status column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive'));

-- Update existing users without clerk_user_id to pending
UPDATE users
SET status = 'pending'
WHERE clerk_user_id IS NULL AND status = 'active';

-- Update existing users with clerk_user_id to active
UPDATE users
SET status = 'active'
WHERE clerk_user_id IS NOT NULL;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Add comment
COMMENT ON COLUMN users.status IS 'User status: pending (invited but not signed up), active (signed up and active), inactive (deactivated)';
