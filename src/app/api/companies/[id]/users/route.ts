/**
 * Company Users API Routes
 * GET /api/companies/[id]/users - List users in a company
 * POST /api/companies/[id]/users - Add a user to a company
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUsersByCompany, createUser } from '@/lib/users';
import { getCompanyById } from '@/lib/companies';
import { requireCompanyAccess, requireCompanyAdmin, getCurrentUser } from '@/lib/permissions';
import { sendInvitationEmail } from '@/lib/invitations';

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

    // Create user with pending status (will be activated when they sign up)
    const user = await createUser({
      company_id: id,
      email: body.email,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      phone: body.phone || null,
      role: body.role,
      status: 'pending', // User starts as pending until they accept invitation
      clerk_user_id: body.clerk_user_id || null,
    });

    // Automatically send invitation email
    try {
      const company = await getCompanyById(id);
      const currentUser = await getCurrentUser();
      const inviterName = currentUser
        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
        : undefined;

      if (company) {
        await sendInvitationEmail({
          email: user.email,
          firstName: user.first_name || undefined,
          lastName: user.last_name || undefined,
          companyName: company.name,
          companyId: company.id,
          inviterName,
        });
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the user creation if email fails
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
