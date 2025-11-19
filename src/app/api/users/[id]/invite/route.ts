/**
 * Send invitation email to a user
 * POST /api/users/[id]/invite
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/lib/users';
import { getCompanyById } from '@/lib/companies';
import { sendInvitationEmail } from '@/lib/invitations';
import { canManageUser, getCurrentUser } from '@/lib/permissions';
import { clerkClient } from '@clerk/nextjs/server';

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

    // Check if email already has a Clerk account
    let clerkUserId: string | null = user.clerk_user_id;
    let shouldSendInvitation = true;

    try {
      const clerk = await clerkClient();
      const clerkUsers = await clerk.users.getUserList({
        emailAddress: [user.email],
      });

      if (clerkUsers.data.length > 0) {
        // User already has a Clerk account - link it immediately
        const existingClerkUser = clerkUsers.data[0];
        clerkUserId = existingClerkUser.id;
        shouldSendInvitation = false;

        // Update the user with Clerk ID and activate them
        await updateUser(user.id, {
          clerk_user_id: clerkUserId,
          status: 'active',
        });

        console.log(`Found existing Clerk account for ${user.email}, linked and activated user`);

        return NextResponse.json({
          success: true,
          message: `User already has an account and was linked successfully`,
          linked: true,
        });
      }
    } catch (clerkError) {
      console.error('Error checking Clerk for existing user:', clerkError);
      // Continue with normal flow if Clerk check fails
    }

    // If user already linked (from database), don't send invitation again
    if (user.clerk_user_id && !clerkUserId) {
      return NextResponse.json(
        { error: 'User already has an account linked' },
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
      companyId: company.id,
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
      linked: false,
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
