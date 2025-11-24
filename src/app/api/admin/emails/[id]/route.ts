import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isSuperAdmin, getUserPermissions } from "@/lib/permissions";
import { deleteEmailRecord } from "@/lib/email-tracking";

/**
 * DELETE /api/admin/emails/[id] - Delete an email tracking record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const superAdmin = await isSuperAdmin();
    const permissions = await getUserPermissions();

    if (!superAdmin && !permissions.isCompanyAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only admins can delete email records." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get current user
    const currentUser = await getCurrentUser();

    // For non-super admins, verify they own this email
    if (!superAdmin && currentUser) {
      // Get all emails for the current user to check ownership
      const { getEmailRecords } = await import("@/lib/email-tracking");
      const userEmails = await getEmailRecords(currentUser.id);
      const email = userEmails.find((e) => e.id === id);

      if (!email) {
        return NextResponse.json(
          { error: "Email record not found or access denied" },
          { status: 404 }
        );
      }

      if (email.sender_user_id !== currentUser.id) {
        return NextResponse.json(
          { error: "Unauthorized. You can only delete your own email records." },
          { status: 403 }
        );
      }
    }

    // Delete the email record
    await deleteEmailRecord(id);

    return NextResponse.json({
      success: true,
      message: "Email record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting email record:", error);
    return NextResponse.json(
      {
        error: "Failed to delete email record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

