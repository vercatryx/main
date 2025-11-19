/**
 * User API Routes
 * GET /api/users/[id] - Get user details
 * PATCH /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
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
    const superAdmin = await isSuperAdmin();
    if (!superAdmin) {
      const currentUser = await getCurrentUser();
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

    const updates: any = {};
    if (body.email !== undefined) updates.email = body.email;
    if (body.first_name !== undefined) updates.first_name = body.first_name;
    if (body.last_name !== undefined) updates.last_name = body.last_name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.role !== undefined) updates.role = body.role;
    if (body.status !== undefined) updates.status = body.status;
    if (body.clerk_user_id !== undefined) updates.clerk_user_id = body.clerk_user_id;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const user = await updateUser(id, updates);
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

    // Company admins cannot delete other admins
    const superAdmin = await isSuperAdmin();
    if (!superAdmin) {
      const currentUser = await getCurrentUser();
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
