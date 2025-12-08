-- Enable Row Level Security on all tables
-- This provides defense in depth even though server-side code uses service role key

-- Enable RLS on payments_requests
ALTER TABLE payments_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pdf_signature_requests
ALTER TABLE pdf_signature_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pdf_signature_fields
ALTER TABLE pdf_signature_fields ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pdf_signatures
ALTER TABLE pdf_signatures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow service role full access to payments_requests" ON payments_requests;
DROP POLICY IF EXISTS "Allow public read for payments_requests" ON payments_requests;
DROP POLICY IF EXISTS "Allow service role full access to pdf_signature_requests" ON pdf_signature_requests;
DROP POLICY IF EXISTS "Allow public read for pdf_signature_requests" ON pdf_signature_requests;
DROP POLICY IF EXISTS "Allow service role full access to pdf_signature_fields" ON pdf_signature_fields;
DROP POLICY IF EXISTS "Allow public read for pdf_signature_fields" ON pdf_signature_fields;
DROP POLICY IF EXISTS "Allow service role full access to pdf_signatures" ON pdf_signatures;
DROP POLICY IF EXISTS "Allow public read for pdf_signatures" ON pdf_signatures;

-- Payments Requests Policies
-- Service role has full access (though it bypasses RLS anyway, this is for completeness)
CREATE POLICY "Allow service role full access to payments_requests"
  ON payments_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access (for payment pages)
-- Note: API routes validate tokens before returning data
-- This policy allows SELECT only - writes are blocked for anon/authenticated
CREATE POLICY "Allow public read for payments_requests"
  ON payments_requests
  FOR SELECT
  TO anon, authenticated
  USING (true); -- API routes validate public_token before returning data

-- PDF Signature Requests Policies
CREATE POLICY "Allow service role full access to pdf_signature_requests"
  ON pdf_signature_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access (for signature pages)
-- Note: API routes validate tokens before returning data
CREATE POLICY "Allow public read for pdf_signature_requests"
  ON pdf_signature_requests
  FOR SELECT
  TO anon, authenticated
  USING (true); -- API routes validate public_token before returning data

-- PDF Signature Fields Policies
CREATE POLICY "Allow service role full access to pdf_signature_fields"
  ON pdf_signature_fields
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access for fields (API routes validate access)
CREATE POLICY "Allow public read for pdf_signature_fields"
  ON pdf_signature_fields
  FOR SELECT
  TO anon, authenticated
  USING (true); -- API routes validate access through parent request

-- PDF Signatures Policies
CREATE POLICY "Allow service role full access to pdf_signatures"
  ON pdf_signatures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access for signatures (API routes validate access)
CREATE POLICY "Allow public read for pdf_signatures"
  ON pdf_signatures
  FOR SELECT
  TO anon, authenticated
  USING (true); -- API routes validate access through parent request

-- Note: The service_role key bypasses RLS, so these policies primarily protect against
-- accidental use of the anon key. All server-side operations use service_role and will work normally.

