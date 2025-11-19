import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { SignIn, SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getCompanyProjects } from "@/lib/projects";
import { getCurrentUser, getUserWithCompany } from "@/lib/users";
import { isSuperAdmin } from "@/lib/permissions";
import ClientPortal from "./page-client";

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

  // Check if user is super admin - redirect to admin portal
  const superAdmin = await isSuperAdmin();
  if (superAdmin) {
    redirect("/admin");
  }

  // Get user from database
  const dbUser = await getCurrentUser();

  if (!dbUser) {
    // User not in database yet - redirect to admin or show error
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-100">
              Account Not Set Up
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              Your account has not been set up yet. Please contact your administrator.
            </p>
            <SignOutButton>
              <button className="px-6 py-3 bg-red-700/80 hover:bg-red-600 rounded-lg transition-colors text-white font-medium">
                Sign Out
              </button>
            </SignOutButton>

          </div>
        </div>
      </main>
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

  const userName = userWithCompany.first_name || clerkUser.firstName || clerkUser.emailAddresses[0].emailAddress.split('@')[0];

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>}>
      <ClientPortal
        projects={projects}
        userName={userName}
        companyName={userWithCompany.company.name}
        user={userWithCompany}
      />
    </Suspense>
  );
}
