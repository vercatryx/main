import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdmin, getUserPermissions } from "@/lib/permissions";
import { getAllCompanies, getCompanyById, getCompanyStats } from "@/lib/companies";
import { getAllUsers, getUsersByCompany } from "@/lib/users";
import { getAllUserProjects, getCompanyProjects } from "@/lib/projects";
import AdminClientNew from "./page-client-new";

async function AdminDashboard() {
  // Get current user from database
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/clients");
  }

  // Get user permissions
  const permissions = await getUserPermissions();
  const superAdmin = await isSuperAdmin();

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

    users = await getAllUsers();
    projects = await getAllUserProjects();
  } else {
    // Company admin sees only their company
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

  return (
    <AdminClientNew
      companies={companies}
      initialUsers={users}
      initialProjects={projects}
      currentUser={currentUser}
      isSuperAdmin={superAdmin}
    />
  );
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <AdminDashboard />
      </div>
    </main>
  );
}
