/**
 * User Project Permissions API
 * GET /api/users/[id]/projects - Get projects user has access to
 * PUT /api/users/[id]/projects - Set which projects user can access (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getUserByClerkId, getUserById } from '@/lib/users';
import { getUserProjectPermissions, setUserProjectPermissions } from '@/lib/user-project-permissions';

// GET - Get projects user has access to
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get the requesting user
    const requestingUser = await getUserByClerkId(userId);

    // Check if requester is superuser
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const isSuperuser = (clerkUser.publicMetadata as { role?: string })?.role === 'superuser';

    // Users can only see their own permissions unless they're admin or superuser
    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isSuperuser && (!requestingUser || requestingUser.id !== id)) {
      // If not superuser, must be admin of same company
      if (!requestingUser || requestingUser.role !== 'admin' || requestingUser.company_id !== targetUser.company_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const projectIds = await getUserProjectPermissions(id);
    return NextResponse.json({ projectIds });
  } catch (error) {
    console.error('Error fetching user project permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// PUT - Set which projects user can access (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { projectIds } = body;

    if (!Array.isArray(projectIds)) {
      return NextResponse.json(
        { error: 'projectIds must be an array' },
        { status: 400 }
      );
    }

    // Get the requesting user
    const requestingUser = await getUserByClerkId(userId);

    // Check if requester is superuser
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const isSuperuser = (clerkUser.publicMetadata as { role?: string })?.role === 'superuser';

    // Must be admin or superuser to set permissions
    if (!isSuperuser && (!requestingUser || requestingUser.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only company admins can manage project permissions' },
        { status: 403 }
      );
    }

    // Get target user to verify same company (if not superuser)
    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If admin (not superuser), can only manage users in same company
    if (!isSuperuser && requestingUser && requestingUser.company_id !== targetUser.company_id) {
      return NextResponse.json(
        { error: 'You can only manage users in your own company' },
        { status: 403 }
      );
    }

    const success = await setUserProjectPermissions(id, projectIds);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user project permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}
