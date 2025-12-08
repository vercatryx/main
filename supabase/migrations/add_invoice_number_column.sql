-- Add invoice_number column for tracking invoice numbers
-- Invoice numbers will start at 1654

ALTER TABLE payments_requests 
ADD COLUMN IF NOT EXISTS invoice_number INTEGER;

-- Create a sequence starting at 1654 for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1654;

-- Create a function to get the next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number() RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('invoice_number_seq');
END;
$$ LANGUAGE plpgsql;

