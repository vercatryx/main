/**
 * Send invitation email to a user
 * POST /api/users/[id]/invite
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/users';
import { getCompanyById } from '@/lib/companies';
import { sendInvitationEmail } from '@/lib/invitations';
import { canManageUser, getCurrentUser } from '@/lib/permissions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check permissions
    if (!await canManageUser(id)) {
      return NextResponse.json(
        { error: 'Forbidden - cannot invite this user' },
        { status: 403 }
      );
    }

    // Get the user to invite
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has a Clerk account
    if (user.clerk_user_id) {
      return NextResponse.json(
        { error: 'User already has an account' },
        { status: 400 }
      );
    }

    // Get company details
    const company = await getCompanyById(user.company_id);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get current user for inviter name
    const currentUser = await getCurrentUser();
    const inviterName = currentUser
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
      : undefined;

    // Send invitation email
    const sent = await sendInvitationEmail({
      email: user.email,
      firstName: user.first_name || undefined,
      lastName: user.last_name || undefined,
      companyName: company.name,
      inviterName,
    });

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${user.email}`,
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
