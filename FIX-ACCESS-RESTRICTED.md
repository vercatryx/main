im # Fix "Access Restricted" Error on Sign-Up Page

## The Problem

When clicking the invitation link, you see "Access restricted" instead of the signup form.

## Root Cause

Clerk is blocking signups because of dashboard settings. We need to allow signups (but our webhook will restrict who can actually use the app).

## Solution: Configure Clerk Dashboard

### Step 1: Enable Sign-Ups

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **User & Authentication** → **Email, Phone, Username**
4. Under **Sign-up options**:
   - ✅ **Enable** "Email address"
   - ✅ **Enable** "Password"
5. Click **Save changes**

### Step 2: Allow Public Sign-Ups

1. In Clerk Dashboard, go to **User & Authentication** → **Restrictions**
2. Under **Sign-up modes**, select:
   - **Public** (allows anyone to sign up)

   OR

   - **Restricted** but with **Allowlist** enabled (we'll add emails dynamically)

3. **Important**: If you see "Waitlist" or other restrictions, disable them for now
4. Click **Save**

### Step 3: Configure Session Settings

1. Go to **Sessions** in Clerk Dashboard
2. Ensure **Session lifetime** is reasonable (e.g., 7 days)
3. Click **Save**

### Step 4: Verify Webhook Settings

1. Go to **Webhooks** in Clerk Dashboard
2. Find your webhook endpoint
3. Ensure it's:
   - ✅ **Enabled**
   - ✅ Subscribed to `user.created` event
   - ✅ Has correct endpoint URL: `https://yourdomain.com/api/webhooks/clerk`

## How Security Still Works

Even though Clerk allows public signups, your app is still secure:

1. **Token validation**: Only users with valid invitation tokens can access `/sign-up`
2. **Webhook rejection**: When a user signs up, the webhook checks if their email is in your database
3. **Access control**: If email is not found → Webhook rejects → User can't access the app
4. **Orphaned accounts**: Worst case, an unauthorized user creates a Clerk account but can't do anything with it

## Testing

### After Making Changes:

1. **Clear browser cache** or use incognito mode
2. **Click invitation link** from email
3. You should now see:
   ```
   Create Your Account
   Please sign up with the email: user@example.com
   [Clerk Signup Form]
   ```

### If Still Seeing "Access Restricted":

Check these in order:

#### 1. Verify Middleware
```bash
# File: src/middleware.ts
# Should have:
const isPublicRoute = createRouteMatcher([
  "/",
  "/contact",
  "/sign-up(.*)",  # ← This should be here
  "/sign-in(.*)",  # ← This should be here
  ...
]);
```

#### 2. Check Environment Variables
```bash
# .env.local should have:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_BASE_URL=https://www.vercatryx.com  # No trailing slash!
```

#### 3. Restart Development Server
```bash
# Stop the server (Ctrl+C)
npm run dev
# Or in production, redeploy
```

#### 4. Check Clerk Domain
1. Go to Clerk Dashboard → **Domains**
2. Ensure your domain is listed
3. If using localhost for testing, make sure `localhost:3000` is in allowed domains

## Alternative: Use Clerk's Allowlist API

If you want maximum security (preventing unauthorized Clerk account creation):

### Implementation:

Update `src/app/api/companies/[id]/users/route.ts`:

```typescript
import { clerkClient } from '@clerk/nextjs/server';

// After creating user in database (line 67):
try {
  const clerk = await clerkClient();

  // Add email to Clerk allowlist
  await clerk.allowlistIdentifiers.createAllowlistIdentifier({
    identifier: user.email,
    notify: false,
  });

  console.log(`Added ${user.email} to Clerk allowlist`);
} catch (error) {
  console.error('Failed to add to Clerk allowlist:', error);
  // Don't fail user creation if allowlist fails
}
```

Then in Clerk Dashboard:
1. Go to **User & Authentication** → **Restrictions**
2. Enable **Allowlist**
3. Select **Email addresses** as identifier type
4. Click **Save**

This way:
- Only emails in your database can create Clerk accounts
- No orphaned Clerk accounts
- More secure than webhook-only approach

## Summary

**Quick Fix:**
1. Clerk Dashboard → **User & Authentication** → **Restrictions**
2. Set sign-up mode to **Public**
3. Save and test

**Secure Fix:**
1. Implement allowlist code above
2. Enable allowlist in Clerk Dashboard
3. Only invited emails can sign up

Both approaches work - choose based on your security requirements!
