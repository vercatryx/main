-- Add columns for recurring payments and interval billing
-- This migration adds support for payment types, billing dates, and Stripe customer/payment method storage

-- Add payment_type column (defaults to 'one_time' for existing records)
ALTER TABLE payments_requests 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'one_time' CHECK (payment_type IN ('one_time', 'monthly', 'interval_billing'));

-- Add next_billing_date column for recurring payments
ALTER TABLE payments_requests 
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Add Stripe customer ID for storing saved payment methods
ALTER TABLE payments_requests 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add Stripe payment method ID for storing saved payment methods
ALTER TABLE payments_requests 
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

-- Update existing records to have 'one_time' as payment_type if NULL
UPDATE payments_requests 
SET payment_type = 'one_time' 
WHERE payment_type IS NULL;

