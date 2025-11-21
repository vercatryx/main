import { redirect } from "next/navigation";
import { currentUser as getClerkUser } from "@clerk/nextjs/server";
import { getCurrentUser, isSuperAdmin, getUserPermissions, isUserIdSuperAdmin } from "@/lib/permissions";
import { getAllCompanies, getCompanyById, getCompanyStats } from "@/lib/companies";
import { getAllUsers, getUsersByCompany } from "@/lib/users";
import { getAllProjects, getCompanyProjects } from "@/lib/projects";
import AdminClientNew from "./page-client-new";

async function filterOutSuperUsers<T extends { clerk_user_id: string | null }>(
  users: T[]
): Promise<T[]> {
  if (!users.length) return users;

  const isSuperFlags = await Promise.all(
    users.map((user) =>
      user.clerk_user_id ? isUserIdSuperAdmin(user.clerk_user_id) : Promise.resolve(false)
    )
  );

  return users.filter((_, index) => !isSuperFlags[index]);
}

async function AdminDashboard() {
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

  // Fetch data based on user role
  let companies, users, projects;

  if (superAdmin) {
    // Super admin sees everything
    companies = await getAllCompanies();
    // Add stats to companies
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => ({
        ...company,
        stats: await getCompanyStats(company.id),
      }))
    );
    companies = companiesWithStats;

    // Exclude any database users that are actually super users in Clerk
    users = await filterOutSuperUsers(await getAllUsers());
    projects = await getAllProjects();
  } else {
    // Company admin sees only their company
    if (!currentUser || !currentUser.company_id) {
      throw new Error("Company admin must have a company");
    }

    const company = await getCompanyById(currentUser.company_id);
    if (!company) {
      throw new Error("Company not found");
    }

    companies = [{
      ...company,
      stats: await getCompanyStats(company.id),
    }];

    users = (await getUsersByCompany(currentUser.company_id)).map((user) => ({
      ...user,
      company,
    }));

    const projectsList = await getCompanyProjects(currentUser.company_id);
    projects = { [currentUser.company_id]: projectsList };
  }

  // Get Clerk user for super admins who don't have DB entry
  const clerkUser = await getClerkUser();
  const userEmail = currentUser?.email || clerkUser?.emailAddresses[0]?.emailAddress || "Admin";

  return (
    <AdminClientNew
      companies={companies}
      initialUsers={users}
      initialProjects={projects}
      currentUser={currentUser}
      userEmail={userEmail}
      isSuperAdmin={superAdmin}
    />
  );
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <AdminDashboard />
      </div>
    </main>
  );
}