import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { SignIn, SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getCompanyProjects } from "@/lib/projects";
import { getCurrentUser, getUserWithCompany, getAllUsers } from "@/lib/users";
import { getAllCompanies } from "@/lib/companies";
import { isSuperAdmin } from "@/lib/permissions";
import ClientPortal from "./page-client";
import AccountSetupChecker from "@/components/account-setup-checker";

export default async function ClientsPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-100">
              Please Sign In
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              You need to be logged in to access the client portal.
            </p>
            <SignIn
              path="/clients"
              appearance={{
                variables: {
                  colorPrimary: "#b91c1c",
                  colorBackground: "#0c0a09",
                  colorText: "#f5f5f5",
                  colorInputBackground: "#1c1917",
                  colorInputText: "#e5e5e5",
                },
              }}
            />
          </div>
        </div>
      </main>
    );
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
      <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>}>
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
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-100">
              Error Loading Account
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              Could not load your account information. Please try again later.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Get projects for user's company
  const projects = await getCompanyProjects(userWithCompany.company_id);

  const userName = [userWithCompany.first_name, userWithCompany.last_name].filter(Boolean).join(' ') || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.emailAddresses[0].emailAddress.split('@')[0];

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>}>
      <ClientPortal
        projects={projects}
        userName={userName}
        companyName={userWithCompany.company.name}
        user={userWithCompany}
        isSuperAdmin={false}
      />
    </Suspense>
  );
}
