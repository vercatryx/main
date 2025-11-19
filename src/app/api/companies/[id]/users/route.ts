/**
 * Company Users API Routes
 * GET /api/companies/[id]/users - List users in a company
 * POST /api/companies/[id]/users - Add a user to a company
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUsersByCompany, createUser } from '@/lib/users';
import { getCompanyById } from '@/lib/companies';
import { requireCompanyAccess, requireCompanyAdmin, getCurrentUser } from '@/lib/permissions';
import { sendInvitationEmail } from "@/lib/invitations-server";
import { clerkClient } from '@clerk/nextjs/server';

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

    // Check if email already has a Clerk account
    let clerkUserId: string | null = null;
    let userStatus: 'pending' | 'active' = 'pending';
    let shouldSendInvitation = true;

    try {
      const clerk = await clerkClient();
      const clerkUsers = await clerk.users.getUserList({
        emailAddress: [body.email],
      });

      if (clerkUsers.data.length > 0) {
        // User already has a Clerk account - link it immediately
        const existingClerkUser = clerkUsers.data[0];
        clerkUserId = existingClerkUser.id;
        userStatus = 'active'; // Activate immediately since they already have an account
        shouldSendInvitation = false; // Don't send invitation - they're already signed up

        console.log(`Found existing Clerk account for ${body.email}, linking user immediately`);
      } else {
        console.log(`No existing Clerk account for ${body.email}, will send invitation`);
      }
    } catch (clerkError) {
      console.error('Error checking Clerk for existing user:', clerkError);
      // Continue with normal flow if Clerk check fails
    }

    // Create user with appropriate status
    const user = await createUser({
      company_id: id,
      email: body.email,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      phone: body.phone || null,
      role: body.role,
      status: userStatus, // 'active' if Clerk account exists, 'pending' otherwise
      clerk_user_id: clerkUserId, // Link to Clerk account if it exists
    });

    // Send invitation email only if user doesn't have Clerk account
    if (shouldSendInvitation) {
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
    }

    return NextResponse.json({
      ...user,
      message: clerkUserId
        ? 'User added successfully and linked to existing account'
        : 'User created and invitation sent'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
