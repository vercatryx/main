-- Create meeting_requests table for storing user meeting requests
CREATE TABLE IF NOT EXISTS meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  message TEXT,
  selected_time_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  confirmed_time_slot TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create blocked_time_slots table for admin-managed blocked times
CREATE TABLE IF NOT EXISTS blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_created_at ON meeting_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_confirmed_time_slot ON meeting_requests(confirmed_time_slot);
CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_start_time ON blocked_time_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_end_time ON blocked_time_slots(end_time);
CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_created_by ON blocked_time_slots(created_by);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at for meeting_requests
CREATE TRIGGER update_meeting_requests_updated_at
  BEFORE UPDATE ON meeting_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

