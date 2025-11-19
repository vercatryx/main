# Clerk Webhook Setup Guide

This guide explains how to configure Clerk webhooks to automatically activate users when they sign up.

## How It Works

1. Company admin creates a user in the system (status: `pending`)
2. Invitation email is automatically sent to the user
3. User receives email and clicks the signup link
4. User signs up via Clerk authentication
5. Clerk sends a `user.created` webhook to your app
6. Webhook handler links the Clerk account to the database user
7. User status changes from `pending` to `active`
8. User's first/last name from Clerk is saved to database

## Setup Steps

### 1. Add Environment Variable

Add the following to your `.env.local` file:

```bash
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

You'll get this secret in step 3.

### 2. Configure Webhook in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Webhooks** in the left sidebar
4. Click **+ Add Endpoint**

### 3. Webhook Configuration

**Endpoint URL:**
- **Development:** `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
- **Production:** `https://yourdomain.com/api/webhooks/clerk`

**Subscribe to events:**
- ✅ `user.created`

**Message Filtering (Optional):**
- Leave empty to receive all user.created events

### 4. Get Webhook Secret

After creating the endpoint:
1. Click on the endpoint you just created
2. Copy the **Signing Secret** (starts with `whsec_`)
3. Add it to your `.env.local` file as `CLERK_WEBHOOK_SECRET`

### 5. Development Testing with ngrok

For local development, you need to expose your local server to the internet:

```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Start your Next.js dev server
npm run dev

# In a new terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL in the Clerk webhook configuration
```

### 6. Test the Webhook

1. Create a test user in your admin panel (status will be `pending`)
2. Check that invitation email was sent
3. Sign up with that email through Clerk
4. Verify the webhook was received (check your server logs)
5. Confirm the user's status changed to `active` in your admin panel
6. Confirm the `clerk_user_id` was saved to the database user

## Troubleshooting

### Webhook Returns 400 (Invalid Signature)

- Make sure `CLERK_WEBHOOK_SECRET` matches exactly what's in Clerk dashboard
- Verify the endpoint URL is correct (include `/api/webhooks/clerk`)
- Check that svix headers are being sent by Clerk

### User Not Found in Database

- This is normal for users who sign up directly (not invited)
- Webhook returns 200 with message "User not found in database (direct signup)"
- Only users created by company admins will be linked

### User Status Not Changing to Active

- Check server logs for errors in the webhook handler
- Verify the database `users` table has a `status` column
- Confirm you ran the `add-user-status.sql` migration

### Email Not Matching

- Webhook matches users by email address
- Ensure the email in Clerk matches the email in your database
- Email comparison is case-sensitive

## Database Migration

Before using the webhook, make sure you've applied the status migration:

```sql
-- Run this in Supabase SQL Editor
-- File: add-user-status.sql

ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive'));

UPDATE users
SET status = 'pending'
WHERE clerk_user_id IS NULL AND status = 'active';

UPDATE users
SET status = 'active'
WHERE clerk_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

COMMENT ON COLUMN users.status IS 'User status: pending (invited but not signed up), active (signed up and active), inactive (deactivated)';
```

## Production Deployment

When deploying to production:

1. Update the Clerk webhook endpoint URL to your production domain
2. Make sure `CLERK_WEBHOOK_SECRET` is set in your production environment
3. Test with a real user signup to verify everything works
4. Monitor your application logs for any webhook errors

## Security Notes

- The webhook uses Svix signature verification to ensure requests come from Clerk
- Never expose your `CLERK_WEBHOOK_SECRET` in client-side code
- The webhook endpoint is public but protected by signature verification
- Invalid signatures return 400 errors and are not processed
