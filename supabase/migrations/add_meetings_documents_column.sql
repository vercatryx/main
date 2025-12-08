-- Add documents column to meetings table for storing attached documents
-- This column stores an array of document metadata as JSONB

ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance if needed
CREATE INDEX IF NOT EXISTS idx_meetings_documents ON meetings USING GIN (documents);

