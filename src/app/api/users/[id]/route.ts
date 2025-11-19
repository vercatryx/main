/**
 * User API Routes
 * GET /api/users/[id] - Get user details
 * PATCH /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/lib/users';
import { canManageUser } from '@/lib/permissions';

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

    const body = await req.json();

    // Validate role if provided
    if (body.role && !['admin', 'member'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (body.email !== undefined) updates.email = body.email;
    if (body.first_name !== undefined) updates.first_name = body.first_name;
    if (body.last_name !== undefined) updates.last_name = body.last_name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.role !== undefined) updates.role = body.role;
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
