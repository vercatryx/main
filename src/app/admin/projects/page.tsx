"use client";

import { useState, useEffect } from "react";
import { User } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, Plus, Edit2, Trash2, X } from "lucide-react";

interface Project {
  id: string;
  userId: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStore {
  [userId: string]: Project[];
}

export default function AdminProjectsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<ProjectStore>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
  });

  // Fetch users and projects
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch users from Clerk
        const usersRes = await fetch('/api/admin/users');
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);

        // Fetch all projects
        const projectsRes = await fetch('/api/admin/projects');
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || {});
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser,
          ...formData,
        }),
      });

      if (res.ok) {
        const { project } = await res.json();

        // Update local state
        setProjects((prev) => ({
          ...prev,
          [selectedUser]: [...(prev[selectedUser] || []), project],
        }));

        // Reset form
        setFormData({ title: "", url: "", description: "" });
        setSelectedUser("");
        setShowAddModal(false);
      } else {
        alert('Failed to add project');
      }
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Failed to add project');
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProject) return;

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: editingProject.userId,
          ...formData,
        }),
      });

      if (res.ok) {
        const { project } = await res.json();

        // Update local state
        setProjects((prev) => ({
          ...prev,
          [editingProject.userId]: prev[editingProject.userId].map((p) =>
            p.id === project.id ? project : p
          ),
        }));

        // Reset form
        setFormData({ title: "", url: "", description: "" });
        setEditingProject(null);
      } else {
        alert('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    }
  };

  const handleDeleteProject = async (userId: string, projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Update local state
        setProjects((prev) => ({
          ...prev,
          [userId]: prev[userId].filter((p) => p.id !== projectId),
        }));
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      url: project.url,
      description: project.description || "",
    });
  };

  const closeModals = () => {
    setShowAddModal(false);
    setEditingProject(null);
    setFormData({ title: "", url: "", description: "" });
    setSelectedUser("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Admin
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Manage Client Projects</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Project
          </button>
        </div>

        {/* Projects by User */}
        <div className="space-y-8">
          {users.map((user) => {
            const userProjects = projects[user.id] || [];

            return (
              <div key={user.id} className="bg-gray-900 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">
                  {user.firstName} {user.lastName} ({user.emailAddresses[0]?.emailAddress})
                </h2>

                {userProjects.length === 0 ? (
                  <p className="text-gray-400">No projects yet</p>
                ) : (
                  <div className="space-y-4">
                    {userProjects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-gray-800 rounded-lg p-4 flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{project.title}</h3>
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            {project.url}
                          </a>
                          {project.description && (
                            <p className="text-gray-400 text-sm mt-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => openEditModal(project)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(user.id, project.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Project Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Add Project</h2>
                <button onClick={closeModals} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddProject} className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium">User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} - {user.emailAddresses[0]?.emailAddress}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 font-medium">Project Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                    placeholder="My Awesome Project"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">Project URL</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none resize-none"
                    placeholder="Brief description of the project"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Add Project
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {editingProject && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Edit Project</h2>
                <button onClick={closeModals} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium">Project Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">Project URL</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Update Project
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
