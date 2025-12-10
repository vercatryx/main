import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdmin, getUserPermissions } from "@/lib/permissions";
import { getMeetingRequests } from "@/lib/meeting-scheduling";
import { getAllMeetingsList } from "@/lib/meetings";
import { getAllBlockedTimeSlots } from "@/lib/meeting-scheduling";
import AdminCalendarClient from "./page-client";

export default async function AdminCalendarPage() {
  // Check if user is super admin first (they don't need to be in database)
  const superAdmin = await isSuperAdmin();

  // Get current user from database
  const currentUser = await getCurrentUser();

  // Super admins don't need to be in the database
  if (!superAdmin && !currentUser) {
    redirect("/clients");
  }

  // Get user permissions
  const permissions = await getUserPermissions();

  // Only super admins and company admins can access admin portal
  if (!permissions.isCompanyAdmin && !permissions.isSuperAdmin) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold">Access Denied</h1>
        <p className="mt-4">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Fetch initial data
  const [meetingRequests, meetings, blockedSlots] = await Promise.all([
    getMeetingRequests("pending"), // Only show pending requests
    getAllMeetingsList(),
    getAllBlockedTimeSlots(),
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <AdminCalendarClient
          initialMeetingRequests={meetingRequests}
          initialMeetings={meetings}
          initialBlockedSlots={blockedSlots}
        />
      </div>
    </main>
  );
}

