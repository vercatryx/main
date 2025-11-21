"use client";

import { useEffect, useState } from "react";
import { Building2, Users, FolderOpen, LogOut, RefreshCw, FileSignature } from "lucide-react";
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

type TabType = "companies" | "users" | "projects" | "signatures";

interface SignatureRequest {
  id: string;
  title: string;
  status: "draft" | "sent" | "completed";
  public_token: string;
  created_at: string;
  updated_at: string;
}

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
  const [creatingSignatureRequest, setCreatingSignatureRequest] = useState(false);
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [loadingSignatureRequests, setLoadingSignatureRequests] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

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

  // Load existing signature requests when signatures tab is active
  useEffect(() => {
    if (!isSuperAdmin || activeTab !== "signatures") return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoadingSignatureRequests(true);
        const res = await fetch("/api/pdf-signatures/requests", { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data.requests)) {
          setSignatureRequests(data.requests);
        }
      } catch (err) {
        console.error("Error loading signature requests:", err);
      } finally {
        if (!cancelled) {
          setLoadingSignatureRequests(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isSuperAdmin]);

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
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("signatures")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === "signatures"
                  ? "border-blue-600 text-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSignature className="w-5 h-5" />
              Signatures
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

        {activeTab === "signatures" && isSuperAdmin && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-2">PDF Signature Requests</h2>
              <p className="text-sm text-muted-foreground">
                Create and manage PDF signature requests. You can see which ones are still pending
                and which have been completed, and open any request to place or review signatures.
              </p>
              <form
                className="space-y-4 border border-border/60 rounded-lg p-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (creatingSignatureRequest) return;

                  setCreatingSignatureRequest(true);
                  const form = event.currentTarget;
                  const titleInput = form.querySelector<HTMLInputElement>('input[name="title"]');
                  const fileInput = form.querySelector<HTMLInputElement>('input[name="file"]');

                  if (!fileInput?.files || fileInput.files.length === 0) {
                    setCreatingSignatureRequest(false);
                    alert('Please select a PDF file');
                    return;
                  }

                  const formData = new FormData();
                  formData.append('title', titleInput?.value || 'Signature Request');
                  formData.append('file', fileInput.files[0]);

                  try {
                    const res = await fetch('/api/pdf-signatures/requests', {
                      method: 'POST',
                      body: formData,
                    });

                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || 'Failed to create request');
                    }

                    const data = await res.json();
                    // Redirect to signature placement page for this request
                    if (data.id) {
                      window.location.href = `/admin/signatures/${data.id}`;
                    } else {
                      console.error('Request created, but ID was missing from response.');
                      setCreatingSignatureRequest(false);
                      alert('Request created, but something went wrong. Please refresh the page.');
                    }
                  } catch (error) {
                    console.error(error);
                    setCreatingSignatureRequest(false);
                    alert(
                      error instanceof Error
                        ? error.message
                        : 'Failed to create PDF signature request'
                    );
                  }
                }}
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Title</label>
                  <input
                    name="title"
                    type="text"
                    className="w-full px-3 py-2 rounded border border-border bg-background"
                    placeholder="e.g. Service Agreement"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">PDF file</label>
                  <input
                    name="file"
                    type="file"
                    accept="application/pdf"
                    className="w-full text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingSignatureRequest}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
                >
                  <FileSignature className="w-4 h-4" />
                  {creatingSignatureRequest ? 'Creating request…' : 'Create request'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Existing requests</h3>
              {loadingSignatureRequests ? (
                <p className="text-sm text-muted-foreground">Loading requests…</p>
              ) : signatureRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No signature requests yet. Create one above to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {signatureRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-border/60 rounded-lg px-3 py-2"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium">{req.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(req.created_at).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            req.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : req.status === "sent"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-slate-500/20 text-slate-200"
                          }`}
                        >
                          {req.status === "completed"
                            ? "Completed"
                            : req.status === "sent"
                            ? "Sent"
                            : "Draft"}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-border text-xs hover:bg-muted disabled:opacity-60"
                          disabled={deletingRequestId === req.id}
                          onClick={async () => {
                            if (!confirm("Delete this signature request and all its PDFs?")) {
                              return;
                            }
                            try {
                              setDeletingRequestId(req.id);
                              const res = await fetch(`/api/pdf-signatures/requests/${req.id}`, {
                                method: "DELETE",
                              });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data.error || "Failed to delete request");
                              }
                              setSignatureRequests((prev) =>
                                prev.filter((r) => r.id !== req.id)
                              );
                            } catch (err) {
                              console.error(err);
                              alert(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to delete signature request"
                              );
                            } finally {
                              setDeletingRequestId(null);
                            }
                          }}
                        >
                          {deletingRequestId === req.id ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded bg-secondary text-xs"
                          onClick={() => {
                            window.location.href = `/admin/signatures/${req.id}`;
                          }}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
