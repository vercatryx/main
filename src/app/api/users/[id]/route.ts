/**
 * User API Routes
 * GET /api/users/[id] - Get user details
 * PATCH /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserById, updateUser, deleteUser } from '@/lib/users';
import { canManageUser, isSuperAdmin, getCurrentUser } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!await canManageUser(id)) {
      return NextResponse.json(
        { error: 'Forbidden - cannot access this user' },
        { status: 403 }
      );
    }

    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!await canManageUser(id)) {
      return NextResponse.json(
        { error: 'Forbidden - cannot update this user' },
        { status: 403 }
      );
    }

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent users from editing themselves (including admins)
    const currentUser = await getCurrentUser();
    const superAdmin = await isSuperAdmin();
    
    // Check if trying to edit self (for users with DB entry)
    if (currentUser && currentUser.id === id) {
      return NextResponse.json(
        { error: 'Forbidden - cannot edit yourself' },
        { status: 403 }
      );
    }
    
    // For super admins without DB entry, check via Clerk ID
    if (superAdmin && !currentUser && targetUser.clerk_user_id) {
      const { userId } = await auth();
      if (userId === targetUser.clerk_user_id) {
        return NextResponse.json(
          { error: 'Forbidden - cannot edit yourself' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();

    // Validate role if provided
    if (body.role && !['admin', 'member'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (body.status && !['pending', 'active', 'inactive'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Company admins cannot modify other admins
    if (!superAdmin) {
      if (currentUser && targetUser.role === 'admin' && targetUser.company_id === currentUser.company_id) {
        // Prevent company admins from changing other company admins
        if (body.role && body.role !== 'admin') {
          return NextResponse.json(
            { error: 'Forbidden - cannot change role of another admin' },
            { status: 403 }
          );
        }
      }
    }

    // Prevent admins from changing their own all_projects_access
    if (body.all_projects_access !== undefined && targetUser.role === 'admin') {
      // Check if trying to change own access
      if (currentUser && currentUser.id === id) {
        return NextResponse.json(
          { error: 'Forbidden - admins cannot change their own project access' },
          { status: 403 }
        );
      }
      // For super admins without DB entry, check via Clerk ID
      if (superAdmin && !currentUser && targetUser.clerk_user_id) {
        const { userId } = await auth();
        if (userId === targetUser.clerk_user_id) {
          return NextResponse.json(
            { error: 'Forbidden - admins cannot change their own project access' },
            { status: 403 }
          );
        }
      }
      // Admins must always have all_projects_access = true
      if (!body.all_projects_access) {
        return NextResponse.json(
          { error: 'Forbidden - admins must have access to all projects' },
          { status: 403 }
        );
      }
    }

    const updates: any = {};
    if (body.email !== undefined) updates.email = body.email;
    if (body.first_name !== undefined) updates.first_name = body.first_name;
    if (body.last_name !== undefined) updates.last_name = body.last_name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.role !== undefined) updates.role = body.role;
    if (body.status !== undefined) updates.status = body.status;
    if (body.clerk_user_id !== undefined) updates.clerk_user_id = body.clerk_user_id;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    
    // Force all_projects_access to true for admins
    // If role is being changed to admin, automatically set all_projects_access to true
    const newRole = body.role !== undefined ? body.role : targetUser.role;
    if (newRole === 'admin') {
      updates.all_projects_access = true; // Always true for admins
    } else if (body.all_projects_access !== undefined) {
      // Only allow changing all_projects_access for non-admins
      updates.all_projects_access = body.all_projects_access;
    }

    const user = await updateUser(id, updates);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!await canManageUser(id)) {
      return NextResponse.json(
        { error: 'Forbidden - cannot delete this user' },
        { status: 403 }
      );
    }

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent users from deleting themselves (including admins)
    const currentUser = await getCurrentUser();
    const superAdmin = await isSuperAdmin();
    
    // Check if trying to delete self (for users with DB entry)
    if (currentUser && currentUser.id === id) {
      return NextResponse.json(
        { error: 'Forbidden - cannot delete yourself' },
        { status: 403 }
      );
    }
    
    // For super admins without DB entry, check via Clerk ID
    if (superAdmin && !currentUser && targetUser.clerk_user_id) {
      const { userId } = await auth();
      if (userId === targetUser.clerk_user_id) {
        return NextResponse.json(
          { error: 'Forbidden - cannot delete yourself' },
          { status: 403 }
        );
      }
    }

    // Company admins cannot delete other admins
    if (!superAdmin) {
      if (currentUser && targetUser.role === 'admin' && targetUser.company_id === currentUser.company_id) {
        return NextResponse.json(
          { error: 'Forbidden - cannot delete another admin' },
          { status: 403 }
        );
      }
    }

    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    );
  }
}
