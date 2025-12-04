"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Building2, Users, FolderOpen, ChevronDown, ChevronRight, Mail, Phone, User as UserIcon, ExternalLink, Send } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Company, User } from "@/types/company";
import UserProjectAssignment from "./user-project-assignment";

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

interface CompaniesManagementProps {
  initialCompanies: Company[];
  initialUsers: UserWithCompany[];
  initialProjects: Project[];
  currentUser: User | null;
  onDataChange?: () => void;
}

export default function CompaniesManagement({
  initialCompanies,
  initialUsers,
  initialProjects,
  currentUser,
  onDataChange
}: CompaniesManagementProps) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [users, setUsers] = useState<UserWithCompany[]>(initialUsers);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithCompany | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [assigningProjectsUser, setAssigningProjectsUser] = useState<UserWithCompany | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "member" as "admin" | "member",
    company_id: "",
  });
  const [projectFormData, setProjectFormData] = useState({
    title: "",
    url: "http://vercatryx.com/projects/blank",
    description: "",
    companyId: "",
  });

  // Group users and projects by company
  const usersByCompany = users.reduce((acc, user) => {
    const companyId = user.company_id;
    if (!acc[companyId]) {
      acc[companyId] = [];
    }
    acc[companyId].push(user);
    return acc;
  }, {} as Record<string, UserWithCompany[]>);

  const projectsByCompany = projects.reduce((acc, project) => {
    const companyId = project.companyId;
    if (!acc[companyId]) {
      acc[companyId] = [];
    }
    acc[companyId].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const openAddCompanyModal = () => {
    setEditingCompany(null);
    setCompanyName("");
    setShowCompanyModal(true);
  };

  const openEditCompanyModal = (company: Company) => {
    setEditingCompany(company);
    setCompanyName(company.name);
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setEditingCompany(null);
    setCompanyName("");
  };

  const openAddUserModal = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setEditingUser(null);
    setUserFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "member",
      company_id: companyId,
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (user: UserWithCompany) => {
    setEditingUser(user);
    setUserFormData({
      email: user.email,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      role: user.role,
      company_id: user.company_id,
    });
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setSelectedCompanyId("");
  };

  const openAddProjectModal = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setEditingProject(null);
    setProjectFormData({
      title: "",
      url: "http://vercatryx.com/projects/blank",
      description: "",
      companyId: companyId,
    });
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setProjectFormData({
      title: project.title,
      url: project.url,
      description: project.description || "",
      companyId: project.companyId,
    });
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
    setSelectedCompanyId("");
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCompany) {
        // Update company
        const res = await fetch(`/api/companies/${editingCompany.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: companyName }),
        });

        if (res.ok) {
          const updated = await res.json();
          setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
          onDataChange?.();
        } else {
          alert("Failed to update company");
        }
      } else {
        // Create company
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: companyName }),
        });

        if (res.ok) {
          const newCompany = await res.json();
          setCompanies(prev => [...prev, { ...newCompany, stats: { users: 0, projects: 0, meetings: 0 } }]);
          onDataChange?.();
        } else {
          alert("Failed to create company");
        }
      }

      closeCompanyModal();
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Failed to save company");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userFormData),
        });

        if (res.ok) {
          const updated = await res.json();
          const company = companies.find(c => c.id === updated.company_id);
          setUsers(prev => prev.map(u => u.id === updated.id ? { ...updated, company: company! } : u));
          onDataChange?.();
        } else {
          alert("Failed to update user");
        }
      } else {
        // Create user
        const res = await fetch(`/api/companies/${userFormData.company_id}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userFormData),
        });

        if (res.ok) {
          const response = await res.json();
          const company = companies.find(c => c.id === userFormData.company_id);
          setUsers(prev => [...prev, { ...response, company: company! }]);
          onDataChange?.();

          if (response.message) {
            alert(response.message);
          }
        } else {
          alert("Failed to create user");
        }
      }

      closeUserModal();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProject) {
        // Update project
        const res = await fetch(`/api/projects/${editingProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectFormData),
        });

        if (res.ok) {
          const { project } = await res.json();
          const company = companies.find(c => c.id === project.companyId);
          setProjects(prev => prev.map(p => p.id === project.id ? { ...project, company } : p));
          onDataChange?.();
        } else {
          alert("Failed to update project");
        }
      } else {
        // Create project
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...projectFormData,
            targetCompanyId: projectFormData.companyId,
          }),
        });

        if (res.ok) {
          const { project } = await res.json();
          const company = companies.find(c => c.id === project.companyId);
          setProjects(prev => [...prev, { ...project, company }]);
          onDataChange?.();
        } else {
          alert("Failed to create project");
        }
      }

      closeProjectModal();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        onDataChange?.();
      } else {
        alert("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        onDataChange?.();
      } else {
        alert("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (userId: string) => {
    if (!confirm("Send invitation email to this user?")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/users/${userId}/invite`, {
        method: "POST",
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message || "Invitation sent successfully!");

        if (result.linked) {
          const userRes = await fetch(`/api/users/${userId}`);
          if (userRes.ok) {
            const updatedUser = await userRes.json();
            const companyRes = await fetch(`/api/companies/${updatedUser.company_id}`);
            const company = await companyRes.json();

            setUsers(prev => prev.map(u =>
              u.id === userId ? { ...updatedUser, company } : u
            ));
          }
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!confirm("Are you sure? This will delete all users and projects in this company!")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCompanies(prev => prev.filter(c => c.id !== companyId));
        onDataChange?.();
      } else {
        alert("Failed to delete company");
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Failed to delete company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Companies</h2>
        <button
          onClick={openAddCompanyModal}
          className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <div className="space-y-4">
        {companies.map((company) => {
          const companyUsers = usersByCompany[company.id] || [];
          const companyProjects = projectsByCompany[company.id] || [];
          const isExpanded = expandedCompanies.has(company.id);

          return (
            <Collapsible
              key={company.id}
              open={isExpanded}
              onOpenChange={() => toggleCompany(company.id)}
            >
              <div className="bg-card/80 rounded-lg border border-border/50 overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Building2 className="w-5 h-5 text-blue-400" />
                      <div>
                        <h3 className="font-semibold text-lg text-left">{company.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {companyUsers.length} {companyUsers.length === 1 ? 'user' : 'users'} • {companyProjects.length} {companyProjects.length === 1 ? 'project' : 'projects'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openEditCompanyModal(company)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openEditCompanyModal(company); }}
                        className="p-1.5 hover:bg-secondary/60 rounded transition-colors cursor-pointer"
                        title="Edit company"
                      >
                        <Edit2 className="w-4 h-4" />
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleDelete(company.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(company.id); }}
                        className="p-1.5 hover:bg-red-500/20/40 rounded transition-colors text-red-400 cursor-pointer"
                        title="Delete company"
                      >
                        <Trash2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-6">
                    {/* Users Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-400" />
                          Users ({companyUsers.length})
                        </h4>
                        <button
                          onClick={() => openAddUserModal(company.id)}
                          className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add User
                        </button>
                      </div>
                      {companyUsers.length > 0 ? (
                        <div className="bg-secondary/20 rounded-lg border border-border/50 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-secondary/50 border-b border-border/50">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Phone</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Role</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {companyUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-secondary/30">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">
                                        {user.first_name || user.last_name
                                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                          : 'No name'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 text-foreground">
                                      <Mail className="w-4 h-4 text-muted-foreground" />
                                      {user.email}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-foreground">
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-muted-foreground" />
                                      {user.phone || '—'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                        ? 'bg-purple-900/60 text-purple-300'
                                        : 'bg-secondary/60 text-foreground'
                                        }`}
                                    >
                                      {user.role}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active'
                                        ? 'bg-green-900/60 text-green-300'
                                        : user.status === 'pending'
                                          ? 'bg-yellow-900/60 text-yellow-300'
                                          : 'bg-red-500/20/60 text-red-400'
                                        }`}
                                    >
                                      {user.status === 'active' && '● Active'}
                                      {user.status === 'pending' && '○ Pending'}
                                      {user.status === 'inactive' && '✕ Inactive'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2 justify-end">
                                      {user.status === 'pending' && (
                                        <button
                                          onClick={() => sendInvitation(user.id)}
                                          className="p-1.5 hover:bg-blue-500/20/40 rounded transition-colors text-blue-400"
                                          title="Send invitation email"
                                        >
                                          <Send className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setAssigningProjectsUser(user)}
                                        disabled={currentUser?.id === user.id || user.role === 'admin'}
                                        className="p-1.5 hover:bg-blue-500/20/40 rounded transition-colors text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={currentUser?.id === user.id ? "Cannot change your own project access" : user.role === 'admin' ? "Admins have access to all projects" : "Assign projects"}
                                      >
                                        <FolderOpen className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => openEditUserModal(user)}
                                        disabled={currentUser?.id === user.id}
                                        className="p-1.5 hover:bg-secondary/60 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={currentUser?.id === user.id ? "Cannot edit yourself" : "Edit user"}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        disabled={currentUser?.id === user.id}
                                        className="p-1.5 hover:bg-red-500/20/40 rounded transition-colors text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={currentUser?.id === user.id ? "Cannot delete yourself" : "Delete user"}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-lg border border-border/50">
                          <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No users for this company</p>
                        </div>
                      )}
                    </div>

                    {/* Projects Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-blue-400" />
                          Projects ({companyProjects.length})
                        </h4>
                        <button
                          onClick={() => openAddProjectModal(company.id)}
                          className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Project
                        </button>
                      </div>
                      {companyProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {companyProjects.map((project) => (
                            <div
                              key={project.id}
                              className="bg-secondary/40 rounded-lg p-6 border border-border/50 hover:border-border transition-colors flex flex-col"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="w-5 h-5 text-blue-400" />
                                  <h3 className="font-semibold text-lg">{project.title}</h3>
                                </div>
                                <div className="flex gap-2">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openEditProjectModal(project)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openEditProjectModal(project); }}
                                    className="p-1.5 hover:bg-secondary/60 rounded transition-colors cursor-pointer"
                                    title="Edit project"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </div>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleDeleteProject(project.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDeleteProject(project.id); }}
                                    className="p-1.5 hover:bg-red-500/20/40 rounded transition-colors text-red-400 cursor-pointer"
                                    title="Delete project"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </div>
                                </div>
                              </div>

                              {project.description && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                              )}

                              <div className="mt-auto space-y-3">
                                <a
                                  href={project.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 break-all"
                                >
                                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{project.url}</span>
                                </a>

                                <div className="pt-3 border-t border-border/50">
                                  <p className="text-xs text-muted-foreground">
                                    Created {new Date(project.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-lg border border-border/50">
                          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No projects for this company</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Company Add/Edit Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full border border-border/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingCompany ? "Edit Company" : "Add Company"}
              </h3>
              <button
                onClick={closeCompanyModal}
                className="p-1 hover:bg-secondary/60 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label htmlFor="companyName" className="block mb-2 font-medium text-foreground">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeCompanyModal}
                  className="px-4 py-2 bg-secondary/80 hover:bg-secondary rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors disabled:bg-secondary/50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Saving..." : editingCompany ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingUser ? "Edit User" : "Add User"}
              </h3>
              <button
                onClick={closeUserModal}
                className="p-1 hover:bg-secondary/60 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium text-foreground">First Name</label>
                  <input
                    type="text"
                    value={userFormData.first_name}
                    onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                    className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-foreground">Last Name</label>
                  <input
                    type="text"
                    value={userFormData.last_name}
                    onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                    className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Email *</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Phone</label>
                <input
                  type="tel"
                  value={userFormData.phone}
                  onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Role *</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as "admin" | "member" })}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground transition-colors"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2 bg-secondary/80 hover:bg-secondary rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors disabled:bg-secondary/50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Saving..." : editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Add/Edit Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full border border-border/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingProject ? "Edit Project" : "Add Project"}
              </h3>
              <button
                onClick={closeProjectModal}
                className="p-1 hover:bg-secondary/60 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium text-foreground">Project Title *</label>
                <input
                  type="text"
                  value={projectFormData.title}
                  onChange={(e) => setProjectFormData({ ...projectFormData, title: e.target.value })}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="Website Redesign"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Project URL *</label>
                <input
                  type="url"
                  value={projectFormData.url}
                  onChange={(e) => setProjectFormData({ ...projectFormData, url: e.target.value })}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Description</label>
                <textarea
                  value={projectFormData.description}
                  onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors resize-none"
                  placeholder="Project description..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={closeProjectModal}
                  className="px-4 py-2 bg-secondary/80 hover:bg-secondary rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors disabled:bg-secondary/50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Saving..." : editingProject ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Assignment Modal */}
      {assigningProjectsUser && (
        <UserProjectAssignment
          userId={assigningProjectsUser.id}
          userName={`${assigningProjectsUser.first_name} ${assigningProjectsUser.last_name}`.trim() || assigningProjectsUser.email}
          companyId={assigningProjectsUser.company_id}
          currentUser={currentUser}
          onClose={() => setAssigningProjectsUser(null)}
        />
      )}
    </div>
  );
}
