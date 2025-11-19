/**
 * Company Users API Routes
 * GET /api/companies/[id]/users - List users in a company
 * POST /api/companies/[id]/users - Add a user to a company
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUsersByCompany, createUser } from '@/lib/users';
import { requireCompanyAccess, requireCompanyAdmin } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompanyAccess(id);

    const users = await getUsersByCompany(id);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching company users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompanyAdmin(id);

    const body = await req.json();

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.role || !['admin', 'member'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Valid role is required (admin or member)' },
        { status: 400 }
      );
    }

    const user = await createUser({
      company_id: id,
      email: body.email,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      phone: body.phone || null,
      role: body.role,
      clerk_user_id: body.clerk_user_id || null,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
