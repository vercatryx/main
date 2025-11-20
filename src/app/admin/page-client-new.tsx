"use client";

import { useState } from "react";
import { Building2, Users, FolderOpen, LogOut, RefreshCw } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import CompaniesManagement from "@/components/admin/companies-management";
import UsersManagementNew from "@/components/admin/users-management-new";
import ProjectsManagementNew from "@/components/admin/projects-management-new";
import type { Company, User } from "@/types/company";

interface UserWithCompany extends User {
  company: Company;
}

interface Project {
  id: string;
  companyId: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}

interface AdminClientNewProps {
  companies: (Company & { stats?: { users: number; projects: number; meetings: number } })[];
  initialUsers: UserWithCompany[];
  initialProjects: { [companyId: string]: Project[] } | Project[];
  currentUser: User | null;
  userEmail: string;
  isSuperAdmin: boolean;
}

type TabType = "companies" | "users" | "projects";

export default function AdminClientNew({
  companies,
  initialUsers,
  initialProjects,
  currentUser,
  userEmail,
  isSuperAdmin,
}: AdminClientNewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(isSuperAdmin ? "companies" : "users");
  const [refreshing, setRefreshing] = useState(false);

  // Refresh all data by reloading the page
  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  // Callback for when data changes (create/edit operations)
  const handleDataChange = () => {
    handleRefresh();
  };

  // Convert projects to flat array with company info
  const projectsArray: Project[] = Array.isArray(initialProjects)
    ? initialProjects
    : Object.entries(initialProjects).flatMap(([companyId, projects]) =>
      projects.map((project) => ({
        ...project,
        company: companies.find((c) => c.id === companyId),
      }))
    );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? "Super Admin" : "Company Admin"} - {userEmail}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
              title="Refresh all data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <SignOutButton redirectUrl="/sign-in">
              <button className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/50 mb-8">
        <div className="flex gap-4">
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("companies")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === "companies"
                  ? "border-blue-600 text-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Building2 className="w-5 h-5" />
              Companies
              <span className="px-2 py-0.5 bg-secondary/60 rounded text-xs">
                {companies.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === "users"
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <Users className="w-5 h-5" />
            Users
            <span className="px-2 py-0.5 bg-secondary/60 rounded text-xs">
              {initialUsers.length}
            </span>
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === "projects"
                  ? "border-blue-600 text-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <FolderOpen className="w-5 h-5" />
              Projects
              <span className="px-2 py-0.5 bg-secondary/60 rounded text-xs">
                {projectsArray.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-12">
        {activeTab === "companies" && isSuperAdmin && (
          <CompaniesManagement 
            initialCompanies={companies} 
            initialUsers={initialUsers}
            initialProjects={projectsArray}
            currentUser={currentUser}
            onDataChange={handleDataChange} 
          />
        )}

        {activeTab === "users" && (
          <UsersManagementNew
            initialUsers={initialUsers}
            companies={companies}
            isSuperAdmin={isSuperAdmin}
            currentUser={currentUser}
            onDataChange={handleDataChange}
          />
        )}

        {activeTab === "projects" && isSuperAdmin && (
          <ProjectsManagementNew
            initialProjects={projectsArray}
            companies={companies}
            isSuperAdmin={isSuperAdmin}
            currentCompanyId={currentUser?.company_id || null}
            onDataChange={handleDataChange}
          />
        )}
      </div>
    </div>
  );
}
