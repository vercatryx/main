# Client Project Management

This document explains how to use the client project management system.

## Overview

The client project management system allows administrators to assign multiple project links to each client. Clients can then view their assigned projects on their dashboard at `/clients`.

## Features

- ✅ **Multiple Projects per Client**: Each client can have unlimited project links
- ✅ **Admin Management**: Full CRUD interface for managing all client projects
- ✅ **Rich Project Info**: Projects include title, URL, and optional description
- ✅ **Beautiful UI**: Projects displayed as cards with external link buttons
- ✅ **Secure**: Only admins (superusers) can manage projects
- ✅ **Persistent Storage**: Projects stored in Vercel Blob

## For Administrators

### Accessing Project Management

1. Log in as a superuser
2. Go to `/admin`
3. Click "Manage Client Projects"
4. Or go directly to `/admin/projects`

### Adding a Project

1. Click the **"Add Project"** button
2. Select the client from the dropdown
3. Enter:
   - **Project Title**: Name of the project (e.g., "Company Website")
   - **Project URL**: Full URL to the project (e.g., "https://example.com")
   - **Description** (optional): Brief description of the project
4. Click **"Add Project"**

### Editing a Project

1. Find the project in the list
2. Click the **Edit** button (pencil icon)
3. Update the fields
4. Click **"Update Project"**

### Deleting a Project

1. Find the project in the list
2. Click the **Delete** button (trash icon)
3. Confirm the deletion

### Viewing Projects by Client

Projects are organized by client on the admin page. Each client's section shows:
- Client name and email
- All projects assigned to that client
- Edit and delete buttons for each project

## For Clients

### Viewing Your Projects

1. Log in to your account
2. Go to `/clients`
3. Your projects will be displayed as cards
4. Click **"View Project"** to open the project in a new tab

### Project Card Information

Each project card shows:
- **Project Title**: The name of the project
- **Description**: Brief description (if provided)
- **View Project Button**: Opens the project URL in a new tab

## Technical Details

### Database Structure

Projects are stored in Vercel Blob at `client-projects.json` with the following structure:

```json
{
  "user_123": [
    {
      "id": "proj_1234567890_abc123",
      "userId": "user_123",
      "title": "Project Title",
      "url": "https://example.com",
      "description": "Project description",
      "createdAt": "2025-01-17T12:00:00.000Z",
      "updatedAt": "2025-01-17T12:00:00.000Z"
    }
  ]
}
```

### API Endpoints

#### For Clients
- `GET /api/projects` - Get projects for the authenticated user

#### For Admins
- `GET /api/admin/projects` - Get all projects for all users
- `GET /api/admin/users` - Get all users (for dropdown)
- `POST /api/projects` - Create a new project
- `PATCH /api/projects/[id]` - Update a project
- `DELETE /api/projects/[id]?userId=[userId]` - Delete a project

### Files Created

- `src/lib/projects.ts` - Database utility functions
- `src/app/admin/projects/page.tsx` - Admin project management interface
- `src/app/api/projects/route.ts` - Project CRUD endpoints
- `src/app/api/projects/[id]/route.ts` - Individual project endpoints
- `src/app/api/admin/projects/route.ts` - Admin-only project listing
- `src/app/api/admin/users/route.ts` - Admin-only user listing
- `src/app/clients/page.tsx` - Updated client dashboard with projects

## Setup

The project management system uses the same Vercel Blob storage as the availability feature. No additional setup is required beyond having Blob storage configured.

### Environment Variables

Uses the same `BLOB_READ_WRITE_TOKEN` as the availability feature.

## Common Use Cases

### Onboarding a New Client

1. Create the user account in `/admin`
2. Go to `/admin/projects`
3. Add their project(s)
4. Client can now see their projects at `/clients`

### Delivering Multiple Projects

1. Add each project separately
2. Each project appears as a separate card
3. Client sees all projects in a grid layout

### Updating Project URLs

1. Edit the project
2. Update the URL
3. Change is reflected immediately for the client

## Tips

- ✅ Use descriptive project titles (e.g., "Main Website Redesign")
- ✅ Include descriptions for context (e.g., "New responsive site launched Q1 2025")
- ✅ Test URLs before adding them
- ✅ Group related projects by using similar naming
- ✅ Keep URLs up-to-date if projects move

## Troubleshooting

### Projects Not Showing for Client

- ✅ Verify the project is assigned to the correct user ID
- ✅ Check that the client is logged in
- ✅ Ensure Blob storage is properly configured

### Can't Add Projects (Admin)

- ✅ Verify you're logged in as a superuser
- ✅ Check that `BLOB_READ_WRITE_TOKEN` is set
- ✅ Make sure Vercel Blob is connected to the project

### Projects Display Issues

- ✅ Verify the URL is valid (starts with http:// or https://)
- ✅ Check browser console for errors
- ✅ Clear browser cache and reload
