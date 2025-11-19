# Clerk Allowlist Setup for Invitation-Only Signups

## The Challenge

We want **invitation-only signups** where:
- ✅ Only users with invitations can create accounts
- ✅ Users can only sign up via the invitation link
- ❌ No one can sign up from a public signup page

## Solution: Two-Layer Protection

### Layer 1: Token Validation (Our App)
Our `/sign-up` page validates the invitation token before showing the signup form.

### Layer 2: Webhook Validation (Clerk)
The Clerk webhook rejects signups for emails not in our database.

## Step-by-Step Configuration

### 1. Enable Clerk Sign-Ups

First, we need to allow Clerk to accept signups (we'll restrict them via webhook):

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **User & Authentication** → **Email, Phone, Username**
3. Under **Authentication strategies**:
   - ✅ Enable **Email address**
   - ✅ Enable **Password**
4. Click **Save**

### 2. Configure Clerk Paths

1. In Clerk Dashboard, go to **Paths**
2. Set these URLs:
   - **Sign-up URL**: `/sign-up`
   - **Sign-in URL**: `/sign-in`
   - **Home URL**: `/`
   - **After sign-up URL**: `/clients`
   - **After sign-in URL**: `/clients`
3. Click **Save**

### 3. Disable Public Sign-Up Pages

Since we only want signups via invitation links, we need to hide Clerk's default signup pages:

1. In Clerk Dashboard, go to **User & Authentication** → **Restrictions**
2. Under **Sign-up modes**:
   - Select **Waitlist** or **Restricted**
   - This prevents users from signing up without an invitation
3. Click **Save**

**ALTERNATIVE APPROACH (Recommended):**

Instead of using Clerk restrictions, we can use the **Allowlist** feature dynamically:

1. When a user is created in your database, use Clerk's API to add their email to the allowlist
2. Only emails in the allowlist can sign up
3. This is more secure than just webhook validation

### 4. Option A: Use Webhook Validation Only (Current Setup)

**How it works:**
- Users can visit `/sign-up?invitation=TOKEN`
- Token validation ensures they have an invitation
- They sign up with Clerk
- Webhook validates their email is in the database
- If not in database → Webhook rejects → User can't access app

**Pros:**
- ✅ Simple to implement
- ✅ Already working

**Cons:**
- ❌ Clerk account is created even for unauthorized users (they just can't access the app)

### 5. Option B: Dynamic Allowlist (More Secure)

**How it works:**
- When admin creates user, add their email to Clerk's allowlist via API
- Only allowlisted emails can sign up in Clerk
- Unauthorized emails are blocked before account creation

**Implementation:**

Update `src/app/api/companies/[id]/users/route.ts`:

```typescript
import { clerkClient } from '@clerk/nextjs/server';

// After creating user in database:
try {
  // Add email to Clerk allowlist
  await clerkClient.allowlistIdentifiers.createAllowlistIdentifier({
    identifier: user.email,
    notify: false, // Don't send Clerk's default email (we send ours)
  });
} catch (error) {
  console.error('Failed to add to Clerk allowlist:', error);
}
```

Then in Clerk Dashboard:
1. Go to **User & Authentication** → **Restrictions**
2. Enable **Allowlist**
3. Set **Allowlist identifiers**: Email addresses
4. Click **Save**

### 6. Remove Sign-Up from Public Routes (If Using Allowlist)

If using the allowlist approach, you can keep `/sign-up` protected:

In `src/middleware.ts`:
```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/contact",
  // Remove these if using allowlist:
  // "/sign-up(.*)",
  // "/sign-in(.*)",
  "/api/availability(.*)",
  "/api/contact",
  "/admin/availability(.*)"
]);
```

## Recommended Approach: Hybrid

Combine both for maximum security:

1. ✅ Token validation on `/sign-up` page (prevents unauthorized access)
2. ✅ Clerk allowlist (prevents account creation for non-invited emails)
3. ✅ Webhook validation (final safety net)

This way:
- Users without invitation token → Can't access signup page
- Users with stolen token but wrong email → Blocked by Clerk allowlist
- Any bypass attempts → Caught by webhook

## Testing

### Test Authorized Signup:
```bash
1. Create user in admin panel: test@example.com
2. User added to database (status: pending)
3. User added to Clerk allowlist (if using Option B)
4. Invitation email sent with token
5. User clicks link → /sign-up?invitation=TOKEN
6. Token validated ✓
7. Clerk signup form shown
8. User signs up → Account created ✓
9. Webhook activates user ✓
```

### Test Unauthorized Signup:
```bash
1. Try to access /sign-up (no token)
   → Should see "Invitation Required"

2. Try to sign up with uninvited email
   → If using allowlist: Clerk blocks signup
   → If using webhook only: Webhook rejects, user can't access app

3. Try to access /clients without signing up
   → Middleware redirects to sign-in
```

## Current Implementation

Your app currently uses **Option A (Webhook Validation Only)**.

To fix the "Access restricted" error, you have two choices:

### Choice 1: Keep it simple (Webhook Only)
- Make `/sign-up` a public route (already done in middleware)
- Rely on webhook to reject unauthorized users
- Unauthorized users can create Clerk accounts but can't access the app

### Choice 2: Maximum security (Add Allowlist)
- Implement the allowlist code above
- Enable Clerk allowlist in dashboard
- Unauthorized emails can't even create Clerk accounts

I recommend **Choice 1** for simplicity, unless you're concerned about orphaned Clerk accounts.
