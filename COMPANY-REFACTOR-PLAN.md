# Company-Based User System Refactor Plan

## Overview
Refactor from individual user-based system to company-based multi-tenant system.

---

## Current Architecture (Problems)

### Current Structure:
- ✗ Projects belong directly to individual Clerk users
- ✗ No company/organization concept
- ✗ Users can't be grouped or managed together
- ✗ No way to share projects across a team
- ✗ Limited user information (only Clerk data)

### Current Database:
```
projects
├── id
├── userId (Clerk user ID)
├── title
├── url
└── description

chat_messages
├── id
├── project_id
├── role
├── content
└── attachments

meetings
├── id
├── hostUserId (Clerk user ID)
├── participantUserIds (array of Clerk IDs)
└── ...
```

---

## New Architecture (Solution)

### New Structure:
- ✓ Companies are the primary entity
- ✓ Companies have multiple users
- ✓ Companies have multiple projects
- ✓ Users belong to companies
- ✓ Users can access their company's projects
- ✓ Full user profiles (name, phone, email)
- ✓ Admin manages companies and their users

### New Database Schema:

```sql
-- Companies table
companies
├── id (uuid, primary key)
├── name (text, required)
├── created_at (timestamp)
└── updated_at (timestamp)

-- Users table (replaces relying on Clerk alone)
users
├── id (uuid, primary key)
├── company_id (uuid, foreign key -> companies)
├── clerk_user_id (text, unique, nullable) -- Links to Clerk for auth
├── email (text, required, unique)
├── first_name (text)
├── last_name (text)
├── phone (text)
├── role (enum: 'admin', 'member') -- Company role
├── is_active (boolean, default true)
├── created_at (timestamp)
└── updated_at (timestamp)

-- Projects table (updated)
projects
├── id (uuid, primary key)
├── company_id (uuid, foreign key -> companies) -- NEW
├── title (text)
├── url (text)
├── description (text)
├── created_at (timestamp)
└── updated_at (timestamp)

-- Chat messages (updated)
chat_messages
├── id (text, primary key)
├── project_id (uuid, foreign key -> projects)
├── user_id (uuid, foreign key -> users) -- Changed from Clerk ID
├── role (enum: 'user', 'assistant', 'system')
├── content (jsonb)
├── attachments (jsonb)
├── created_at (timestamp)
└── updated_at (timestamp)

-- Meetings (updated)
meetings
├── id (uuid, primary key)
├── company_id (uuid, foreign key -> companies) -- NEW
├── host_user_id (uuid, foreign key -> users) -- Changed from Clerk ID
├── participant_user_ids (uuid[]) -- Array of user IDs
├── title (text)
├── description (text)
├── scheduled_at (timestamp)
├── duration (integer)
├── status (enum)
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

## Migration Strategy

### Phase 1: Database Setup
1. Create new tables (companies, users)
2. Add company_id to projects
3. Add user_id mappings to chat_messages
4. Add company_id to meetings

### Phase 2: Data Migration
1. Create a default company for existing data
2. Map Clerk users to new users table
3. Migrate projects to company
4. Update chat messages with new user IDs
5. Update meetings with new structure

### Phase 3: Code Refactor
1. Update auth to work with companies
2. Update admin portal:
   - Company management
   - User management per company
   - Project assignment
3. Update client portal:
   - Show company context
   - Filter by company
4. Update APIs:
   - Add company context to all routes
   - Update permissions/middleware

### Phase 4: Testing
1. Test company creation
2. Test user management
3. Test project access
4. Test meetings
5. Test chat functionality

---

## UI Changes

### Admin Portal (New Features):

#### 1. Companies Tab
```
┌─────────────────────────────────────┐
│ Companies                    [+ Add]│
├─────────────────────────────────────┤
│ ▼ Acme Corp (5 users, 12 projects) │
│   → Manage Users                    │
│   → Manage Projects                 │
│   → Settings                        │
│                                     │
│ ▼ TechStart Inc (3 users, 8 proj)  │
│   → Manage Users                    │
│   → Manage Projects                 │
└─────────────────────────────────────┘
```

#### 2. Users Management (Per Company)
```
┌─────────────────────────────────────────────┐
│ Acme Corp - Users              [+ Add User] │
├─────────────────────────────────────────────┤
│ Name          Email           Phone    Role │
│ John Doe      john@acme.com   555-0100 Admin│
│ Jane Smith    jane@acme.com   555-0101 Member│
└─────────────────────────────────────────────┘
```

#### 3. Projects (Per Company)
```
┌─────────────────────────────────────────────┐
│ Acme Corp - Projects      [+ Add Project]   │
├─────────────────────────────────────────────┤
│ Project Name        URL                     │
│ Website Redesign    https://acme-staging... │
│ Mobile App          https://app-demo...     │
└─────────────────────────────────────────────┘
```

### Client Portal (Changes):

#### Header Update:
```
Before: Welcome, John!
After:  Acme Corp - Welcome, John!
```

#### Projects List:
- Only shows projects for user's company
- No change to UI, just filtered data

#### Meetings:
- Only shows meetings for user's company
- Participant selection limited to company users

---

## API Changes

### New Endpoints:

```typescript
// Companies
POST   /api/companies              // Create company
GET    /api/companies              // List all companies (admin)
GET    /api/companies/[id]         // Get company details
PATCH  /api/companies/[id]         // Update company
DELETE /api/companies/[id]         // Delete company

// Users (company-scoped)
POST   /api/companies/[id]/users   // Add user to company
GET    /api/companies/[id]/users   // List company users
PATCH  /api/users/[id]             // Update user
DELETE /api/users/[id]             // Remove user

// Projects (company-scoped)
GET    /api/projects               // Get current user's company projects
POST   /api/projects               // Create project (admin)
```

### Updated Endpoints:

```typescript
// All existing endpoints add company context
GET    /api/chat/[projectId]       // Verify user's company owns project
POST   /api/meetings               // Create meeting for user's company
GET    /api/meetings/upcoming      // Get meetings for user's company
```

---

## Security & Permissions

### User Types:

1. **Super Admin** (Clerk role: superuser)
   - Manages all companies
   - Can create/delete companies
   - Can manage all users across all companies
   - Can access any project

2. **Company Admin** (users.role: admin)
   - Manages their own company's users
   - Can create/edit projects for their company
   - Can create meetings for their company
   - Cannot access other companies

3. **Company Member** (users.role: member)
   - Can access their company's projects
   - Can participate in meetings
   - Cannot manage users or projects

### Permission Checks:

```typescript
// Example middleware
async function requireCompanyAccess(companyId: string, userId: string) {
  const user = await getUser(userId);

  // Super admin can access all companies
  if (user.clerkRole === 'superuser') return true;

  // Check if user belongs to this company
  if (user.company_id !== companyId) {
    throw new Error('Access denied');
  }

  return true;
}
```

---

## Implementation Steps

### Step 1: Database Migration (Day 1)
- [ ] Create Supabase migration files
- [ ] Create companies table
- [ ] Create users table
- [ ] Add company_id to projects
- [ ] Update foreign keys
- [ ] Run migration on dev database

### Step 2: Data Migration (Day 1)
- [ ] Create migration script
- [ ] Create default company
- [ ] Import existing Clerk users
- [ ] Assign projects to company
- [ ] Update chat messages
- [ ] Update meetings
- [ ] Test migrated data

### Step 3: Library/Types Updates (Day 2)
- [ ] Create `src/lib/companies.ts`
- [ ] Create `src/lib/users.ts`
- [ ] Update `src/lib/projects.ts`
- [ ] Update `src/lib/chat.ts`
- [ ] Update `src/lib/meetings.ts`
- [ ] Add TypeScript types

### Step 4: Admin Portal Refactor (Day 2-3)
- [ ] Add Companies tab
- [ ] Add company CRUD operations
- [ ] Update Users tab (company-scoped)
- [ ] Update Projects tab (company-scoped)
- [ ] Update Meetings tab (company-scoped)
- [ ] Add company selector for super admin

### Step 5: Client Portal Updates (Day 3)
- [ ] Add company context
- [ ] Filter projects by company
- [ ] Update user profile with company info
- [ ] Update meetings to show company users
- [ ] Add company name to header

### Step 6: API Updates (Day 4)
- [ ] Create company APIs
- [ ] Create user APIs
- [ ] Update project APIs
- [ ] Update chat APIs
- [ ] Update meeting APIs
- [ ] Add permission middleware

### Step 7: Testing (Day 4-5)
- [ ] Test company creation
- [ ] Test user management
- [ ] Test project access control
- [ ] Test meetings
- [ ] Test chat functionality
- [ ] Test super admin vs company admin
- [ ] Test data isolation between companies

### Step 8: Deployment (Day 5)
- [ ] Run migrations on production
- [ ] Deploy new code
- [ ] Monitor for errors
- [ ] Verify data integrity

---

## Rollback Plan

If issues occur:

1. **Database**: Keep old columns initially, only deprecate after stable
2. **Code**: Use feature flags to switch between old/new logic
3. **Data**: Keep backups before migration

---

## Benefits After Refactor

✅ **Better Organization**
- Companies can manage their own users
- Clear separation between different clients

✅ **Scalability**
- Easy to add new companies
- Users isolated by company

✅ **Improved UX**
- Admins see only their company's data
- Cleaner user management

✅ **More Data**
- Full user profiles (name, phone, email)
- Better reporting possibilities

✅ **Team Collaboration**
- Multiple users per company
- Shared projects
- Company-wide meetings

---

## Estimated Timeline

- **Planning**: 0.5 days ✓
- **Database**: 1 day
- **Migration**: 0.5 days
- **Backend**: 2 days
- **Frontend**: 2 days
- **Testing**: 1 day

**Total**: ~7 days (1 week)

---

## Risk Assessment

### High Risk:
- Data migration (losing user associations)
- Breaking existing Clerk authentication

### Medium Risk:
- UI complexity in admin portal
- Permission logic errors

### Low Risk:
- Adding new fields to user profiles
- Company CRUD operations

### Mitigation:
- Test on development first
- Keep backups
- Gradual rollout
- Feature flags
