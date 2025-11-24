import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isSuperAdmin, getUserPermissions } from "@/lib/permissions";
import { getEmailRecords } from "@/lib/email-tracking";

/**
 * GET /api/admin/emails - Get email history
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const superAdmin = await isSuperAdmin();
    const permissions = await getUserPermissions();

    if (!superAdmin && !permissions.isCompanyAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only admins can view email history." },
        { status: 403 }
      );
    }

    // Get current user
    const currentUser = await getCurrentUser();
    const senderUserId = superAdmin ? null : currentUser?.id || null;

    // Fetch email records
    const emails = await getEmailRecords(senderUserId);

    return NextResponse.json({
      success: true,
      emails,
    });
  } catch (error) {
    console.error("Error fetching email records:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch email records",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

