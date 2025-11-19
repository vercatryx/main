# Invitation-Only Signup Setup Guide

This guide explains how to configure the invitation-only signup system.

## How It Works

1. **Admin creates user** → User added to database with status: `pending`
2. **Invitation email sent** → Contains secure token with 7-day expiration
3. **User clicks signup link** → Redirected to `/sign-up?invitation=TOKEN`
4. **Token validated** → If valid, Clerk signup form shown
5. **User creates account** → Signs up using Clerk authentication
6. **Webhook activates user** → Status changes to `active`, Clerk ID linked
7. **User accesses app** → Full access to company's projects

## Required Configuration

### 1. Environment Variables

Make sure these are set in your `.env.local` file:

```bash
# IMPORTANT: No trailing slash!
NEXT_PUBLIC_BASE_URL=https://www.vercatryx.com

# Clerk Webhook Secret (from Clerk Dashboard)
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email configuration (for sending invitations)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

### 2. Clerk Dashboard Configuration

#### A. Configure Paths

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Paths** in the left sidebar
3. Set the following:
   - **Sign-up URL**: `/sign-up`
   - **Sign-in URL**: `/sign-in`
   - **After sign-up URL**: `/clients`
   - **After sign-in URL**: `/clients`

#### B. Restrict Sign-Ups (IMPORTANT)

To prevent unauthorized signups:

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Under **Authentication strategies**:
   - Enable **Email address** (required for invitations)
   - Disable **SMS** (optional)
3. Go to **Restrictions**:
   - **Enable "Allowlist"** or use **Webhook validation** (recommended)
   - This ensures only invited users can sign up

**Note:** The webhook already rejects unauthorized signups, but enabling Clerk's allowlist provides an extra layer of security.

#### C. Configure Webhook (Already Set Up)

Make sure your webhook is configured to handle `user.created` events:
- **Endpoint**: `https://yourdomain.com/api/webhooks/clerk`
- **Events**: `user.created`
- See `CLERK-WEBHOOK-SETUP.md` for detailed webhook setup

### 3. Database Migration

Make sure you've run the user status migration:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'active', 'inactive'));

-- Update existing users
UPDATE users SET status = 'active' WHERE clerk_user_id IS NOT NULL;
UPDATE users SET status = 'pending' WHERE clerk_user_id IS NULL;
```

## Testing the Flow

### Test with a New User

1. **Create invitation** in admin panel:
   - Go to admin dashboard
   - Add new user with email `test@example.com`
   - User is created with status: `pending`

2. **Check invitation email**:
   - Email should be sent to `test@example.com`
   - Email contains button linking to: `https://yourdomain.com/sign-up?invitation=TOKEN`

3. **Click signup link**:
   - Should see: "Create Your Account" page
   - Shows message: "Please sign up with the email: test@example.com"
   - Clerk signup form visible

4. **Complete signup**:
   - Enter email: `test@example.com`
   - Set password
   - Verify email if required
   - Should redirect to `/clients`

5. **Verify activation**:
   - Check admin panel
   - User status should now be: `active`
   - User should have `clerk_user_id` populated

### Test Invalid Scenarios

**No invitation token:**
- Visit: `https://yourdomain.com/sign-up`
- Should see: "Invitation Required" error page

**Expired token:**
- Use invitation link older than 7 days
- Should see: "Invalid or Expired Invitation" error page

**Unauthorized email:**
- Try to sign up with email not in database
- Webhook returns 403 error
- User cannot access the app

## Troubleshooting

### Issue: Sign-up page shows sign-in form

**Solution:**
1. Check Clerk Dashboard → **Paths** settings
2. Ensure `/sign-up` is set as the Sign-up URL
3. Clear browser cache and cookies
4. Try incognito/private browsing

### Issue: Double slash in URL (/signup)

**Solution:**
Update `.env.local`:
```bash
# Wrong - has trailing slash
NEXT_PUBLIC_BASE_URL=https://www.vercatryx.com/

# Correct - no trailing slash
NEXT_PUBLIC_BASE_URL=https://www.vercatryx.com
```

### Issue: Anyone can sign up

**Solution:**
1. Check webhook is configured and working
2. Check `CLERK_WEBHOOK_SECRET` is set correctly
3. Enable Clerk Allowlist in dashboard
4. Verify webhook logs in Clerk dashboard

### Issue: Invitation email not received

**Solution:**
1. Check email credentials in `.env.local`
2. Check spam folder
3. Verify user was created with correct email
4. Check server logs for email errors

### Issue: User stays "pending" after signup

**Solution:**
1. Check webhook is configured correctly
2. Verify `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
3. Check webhook logs in Clerk dashboard for errors
4. Ensure user signed up with the invited email

## Security Notes

- ✅ Invitation tokens expire after 7 days
- ✅ Tokens are tied to specific email addresses
- ✅ Webhook validates all signups against database
- ✅ Users without invitations cannot access the app
- ✅ Sign-up/sign-in pages are public, but protected by token validation

## User Experience Flow

```
Admin creates user
       ↓
Invitation email sent (with token)
       ↓
User clicks "Create Account"
       ↓
Lands on /sign-up?invitation=TOKEN
       ↓
Token validated ✓
       ↓
Clerk signup form shown
       ↓
User completes signup
       ↓
Webhook fires → Links account
       ↓
Status: pending → active
       ↓
User redirected to /clients
       ↓
Full access granted ✓
```
