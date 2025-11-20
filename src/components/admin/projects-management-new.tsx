"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, ExternalLink, FolderOpen, Building2 } from "lucide-react";
import type { Company } from "@/types/company";

interface Project {
  id: string;
  companyId: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectWithCompany extends Project {
  company?: Company;
}

interface ProjectsManagementProps {
  initialProjects: ProjectWithCompany[];
  companies: Company[];
  isSuperAdmin: boolean;
  currentCompanyId: string | null;
  onDataChange?: () => void;
}

export default function ProjectsManagementNew({
  initialProjects,
  companies,
  isSuperAdmin,
  currentCompanyId,
  onDataChange,
}: ProjectsManagementProps) {
  const [projects, setProjects] = useState<ProjectWithCompany[]>(initialProjects);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithCompany | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    companyId: currentCompanyId || (companies.length > 0 ? companies[0].id : ""),
  });

  const openAddModal = () => {
    setEditingProject(null);
    setFormData({
      title: "",
      url: "",
      description: "",
      companyId: currentCompanyId || (companies.length > 0 ? companies[0].id : ""),
    });
    setShowModal(true);
  };

  const openEditModal = (project: ProjectWithCompany) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      url: project.url,
      description: project.description || "",
      companyId: project.companyId,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProject) {
        // Update project
        const res = await fetch(`/api/projects/${editingProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
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
            ...formData,
            targetCompanyId: formData.companyId,
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

      closeModal();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Projects</h2>
        {isSuperAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-card/80 rounded-lg p-6 border border-border/50 hover:border-border/50 transition-colors flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-lg">{project.title}</h3>
              </div>
              {isSuperAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(project)}
                    className="p-1.5 hover:bg-secondary/60 rounded transition-colors"
                    title="Edit project"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-1.5 hover:bg-red-500/20/40 rounded transition-colors text-red-400"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
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

              {isSuperAdmin && project.company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  {project.company.name}
                </div>
              )}

              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card/80 rounded-lg border border-border/50">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No projects found. Click "Add Project" to create one.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card/95 rounded-lg p-6 max-w-lg w-full border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingProject ? "Edit Project" : "Add Project"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-secondary/60 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium text-foreground">Project Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="Website Redesign"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Project URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors resize-none"
                  placeholder="Project description..."
                />
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block mb-2 font-medium text-foreground">Company *</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    required
                    disabled={!isSuperAdmin}
                    className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={closeModal}
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
    </div>
  );
}
