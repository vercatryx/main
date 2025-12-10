-- Add meeting_request_id column to meetings table
-- This links scheduled meetings back to the original meeting request

ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS meeting_request_id UUID REFERENCES meeting_requests(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_request_id ON meetings(meeting_request_id);

