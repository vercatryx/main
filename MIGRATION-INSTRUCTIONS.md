# Company Refactor Migration Instructions

This guide walks through migrating your database and code to the new company-based multi-tenant system.

## ⚠️ IMPORTANT - Before You Start

1. **Backup your database** - Create a snapshot in Supabase dashboard
2. **This is a major change** - Set aside time to complete the full migration
3. **Test first** - Consider testing on a development/staging database first
4. **Have rollback ready** - Keep the old code version in git

---

## Step 1: Run Database Migrations (5 minutes)

### Option A: Using Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project: `axbdgadfawofkfqsrvyx`
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase/migrations/20250118000001_create_companies_and_users.sql`
5. Paste into SQL Editor and click **Run**
6. Wait for "Success" message
7. Copy the contents of `supabase/migrations/20250118000002_migrate_existing_data.sql`
8. Paste into SQL Editor and click **Run**

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref axbdgadfawofkfqsrvyx

# Run migrations
supabase db push
```

### Verify Migrations

After running, verify in Supabase dashboard → Table Editor:
- ✅ `companies` table exists with default company
- ✅ `users` table exists (empty for now)
- ✅ `projects` table has `company_id` column
- ✅ `meetings` table has `company_id` and new user ID columns
- ✅ `chat_messages` table has `user_id` column

---

## Step 2: Run Data Migration Script (10 minutes)

This script migrates your existing Clerk users to the new users table and updates all references.

```bash
# Install dependencies if needed
npm install

# Run the migration script
npx tsx scripts/migrate-to-companies.ts
```

### What This Script Does

1. Fetches all Clerk users
2. Creates corresponding records in the `users` table
3. Links users to the default company
4. Updates all projects to belong to default company
5. Updates chat messages to reference new user IDs
6. Updates meetings to reference new user IDs

### Expected Output

```
Starting migration to company-based system...

Step 1: Fetching Clerk users...
Found 3 Clerk users

Step 2: Creating users in database...
✓ Created user: admin@vercatryx.com (admin)
✓ Created user: user1@company.com (member)
✓ Created user: user2@company.com (member)

Created 3 users

Step 3: Updating projects...
✓ Updated 5 projects

Step 4: Updating chat messages...
✓ Updated 24 chat messages

Step 5: Updating meetings...
✓ Updated 2 meetings

Migration completed successfully! ✓

Summary:
- Users created: 3
- Projects updated: 5
- Default company ID: 00000000-0000-0000-0000-000000000001
```

### Troubleshooting

**Error: "Cannot find Clerk users"**
- Check that `CLERK_SECRET_KEY` is set in `.env.local`
- Verify you have users in Clerk dashboard

**Error: "Failed to create user"**
- Check that migrations ran successfully
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

**Error: "Cannot connect to Supabase"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check that service role key has proper permissions

---

## Step 3: Verify Data Migration

Go to Supabase Dashboard → Table Editor and verify:

### Companies Table
- Should have 1 row: "Default Company"
- ID: `00000000-0000-0000-0000-000000000001`

### Users Table
- Should have all your Clerk users
- Each has `clerk_user_id` matching Clerk
- Each has `company_id` pointing to default company
- Admins have `role = 'admin'`
- Members have `role = 'member'`

### Projects Table
- All projects should have `company_id` set to default company

### Chat Messages Table
- All messages should have `user_id` populated (not null)

### Meetings Table
- All meetings should have:
  - `company_id` set to default company
  - `host_user_id` populated with new user ID
  - `participant_user_ids` array populated

---

## Step 4: Update Application Code

The library functions have already been updated. Now we need to update the UI components.

### Files Already Updated:
- ✅ `src/lib/companies.ts` - Company management functions
- ✅ `src/lib/users.ts` - User management functions
- ✅ `src/lib/permissions.ts` - Permission checking
- ✅ `src/lib/projects.ts` - Updated for company context
- ✅ `src/types/company.ts` - TypeScript types

### Files That Need Updating:
- 🔄 `src/app/admin/page-client.tsx` - Add company management UI
- 🔄 `src/app/clients/page-client.tsx` - Add company context
- 🔄 API routes for companies/users
- 🔄 Meeting management components

These will be updated in the next steps.

---

## Step 5: Test the Migration

Before deploying, test locally:

```bash
# Start dev server
npm run dev
```

### Test Checklist:

#### Admin Portal (`/admin`)
- [ ] Can see existing projects
- [ ] Can create new projects
- [ ] Can see users in the users tab
- [ ] Projects show under correct company
- [ ] Can create/manage meetings

#### Client Portal (`/clients`)
- [ ] Can sign in
- [ ] Can see projects
- [ ] Can access chat
- [ ] Chat messages load correctly
- [ ] Can upload files
- [ ] Can see meetings

---

## Step 6: Deploy to Production

Once everything works locally:

```bash
# Commit changes
git add .
git commit -m "Refactor: Migrate to company-based multi-tenant system

- Add companies and users tables
- Migrate existing Clerk users to database
- Update projects to belong to companies
- Add permission system with roles
- Update all library functions for company context"

# Push to deploy
git push
```

Vercel will automatically deploy the changes.

---

## Rollback Plan

If something goes wrong:

### Database Rollback

```sql
-- Revert migrations (run in Supabase SQL Editor)

-- Drop new columns
ALTER TABLE projects DROP COLUMN IF EXISTS company_id;
ALTER TABLE meetings DROP COLUMN IF EXISTS company_id;
ALTER TABLE meetings DROP COLUMN IF EXISTS host_user_id;
ALTER TABLE meetings DROP COLUMN IF EXISTS participant_user_ids;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS user_id;

-- Restore old column names
ALTER TABLE meetings RENAME COLUMN host_user_id_old TO hostUserId;
ALTER TABLE meetings RENAME COLUMN participant_user_ids_old TO participantUserIds;

-- Drop new tables
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;
```

### Code Rollback

```bash
# Revert to previous commit
git revert HEAD
git push
```

---

## What's Next

After successful migration, you can:

1. **Add More Companies**: Create companies via admin portal
2. **Invite Users**: Add users to companies with name, phone, email
3. **Assign Projects**: Move projects between companies
4. **Set Up Roles**: Make users admins or members
5. **Clean Up Legacy**: Eventually remove old `userId` fields

---

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Check browser console for errors
3. Check Vercel deployment logs
4. Verify all environment variables are set
5. Review this migration guide

The migration is designed to be safe and reversible. All old data is preserved during the transition.
