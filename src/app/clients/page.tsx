import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getCompanyProjects, getProjectById } from "@/lib/projects";
import { getCurrentUser, getUserWithCompany, getAllUsers } from "@/lib/users";
import { getAllCompanies } from "@/lib/companies";
import { isSuperAdmin } from "@/lib/permissions";
import { getUserAccessibleProjects } from "@/lib/user-project-permissions";
import { getClientsPath } from "@/lib/clients-url";
import ClientPortal from "./page-client";
import AccountSetupChecker from "@/components/account-setup-checker";
import { ThemedSignIn } from "@/components/themed-signin";

export default async function ClientsPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    // Redirect to sign-in page - middleware should handle this, but this is a fallback
    redirect("/sign-in");
  }

  // Check if user is super admin
  const superAdmin = await isSuperAdmin();

  // Get user from database (will be null for super admins)
  const dbUser = await getCurrentUser();

  // Super admins can access clients page to view all projects
  if (superAdmin) {
    const userName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.emailAddresses[0].emailAddress.split('@')[0];

    // Fetch all companies and users for super admin
    const allCompanies = await getAllCompanies();
    const allUsers = await getAllUsers();

    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
        <ClientPortal
          projects={[]}
          userName={userName}
          companyName="Super Admin"
          user={null}
          isSuperAdmin={true}
          companies={allCompanies}
          users={allUsers}
        />
      </Suspense>
    );
  }

  if (!dbUser) {
    // User not in database yet - check and try to sync
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
    return (
      <AccountSetupChecker
        clerkUserId={clerkUser.id}
        userEmail={userEmail}
      />
    );
  }

  // Get user with company details
  const userWithCompany = await getUserWithCompany(dbUser.id);

  if (!userWithCompany) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Error Loading Account
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Could not load your account information. Please try again later.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Get accessible projects for user (based on permissions)
  const accessibleProjectIds = await getUserAccessibleProjects(userWithCompany.id, userWithCompany.company_id);

  // Fetch full project details for accessible projects
  const projects = await Promise.all(
    accessibleProjectIds.map(id => getProjectById(id))
  ).then(results => results.filter((p): p is NonNullable<typeof p> => p !== null));

  const userName = [userWithCompany.first_name, userWithCompany.last_name].filter(Boolean).join(' ') || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.emailAddresses[0].emailAddress.split('@')[0];

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
      <ClientPortal
        projects={projects}
        userName={userName}
        companyName={userWithCompany.company.name}
        user={userWithCompany}
        isSuperAdmin={false}
        hasNoProjects={projects.length === 0}
      />
    </Suspense>
  );
}
