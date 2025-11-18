"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, Video, Users } from "lucide-react";
import { createUser, updateUserRole, deleteUser } from "./actions";
import { SerializableUser } from "./page";
import MeetingsManagement from "@/components/admin/meetings-management";

interface Project {
  id: string;
  userId: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserPublicMetadata {
  role?: "superuser" | "user";
}

interface ProjectStore {
  [userId: string]: Project[];
}

interface AdminClientProps {
  users: SerializableUser[];
  currentUserId: string;
  initialProjects: ProjectStore;
}

export default function AdminClient({ users, currentUserId, initialProjects }: AdminClientProps) {
  const [projects, setProjects] = useState<ProjectStore>(initialProjects);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [activeTab, setActiveTab] = useState<'users' | 'meetings'>('users');
  const [projectForm, setProjectForm] = useState({
    title: "",
    url: "",
    description: "",
  });

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const openAddProjectModal = (userId: string) => {
    setSelectedUserId(userId);
    setProjectForm({ title: "", url: "", description: "" });
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setSelectedUserId(project.userId);
    setProjectForm({
      title: project.title,
      url: project.url,
      description: project.description || "",
    });
    setShowProjectModal(true);
  };

  const closeModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
    setSelectedUserId("");
    setProjectForm({ title: "", url: "", description: "" });
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProject) {
        // Update existing project
        const res = await fetch(`/api/projects/${editingProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: editingProject.userId,
            ...projectForm,
          }),
        });

        if (res.ok) {
          const { project } = await res.json();
          setProjects((prev) => ({
            ...prev,
            [editingProject.userId]: prev[editingProject.userId].map((p) =>
              p.id === project.id ? project : p
            ),
          }));
        } else {
          alert("Failed to update project");
        }
      } else {
        // Create new project
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: selectedUserId,
            ...projectForm,
          }),
        });

        if (res.ok) {
          const { project } = await res.json();
          setProjects((prev) => ({
            ...prev,
            [selectedUserId]: [...(prev[selectedUserId] || []), project],
          }));
        } else {
          alert("Failed to add project");
        }
      }

      closeModal();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project");
    }
  };

  const handleDeleteProject = async (userId: string, projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}?userId=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProjects((prev) => ({
          ...prev,
          [userId]: prev[userId].filter((p) => p.id !== projectId),
        }));
      } else {
        alert("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-b-2 border-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          Users & Projects
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'meetings'
              ? 'border-b-2 border-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Video className="w-5 h-5" />
          Meetings
        </button>
      </div>

      {activeTab === 'meetings' ? (
        <MeetingsManagement users={users} />
      ) : (
        <>
          {/* Create User Form */}
          <div className="mb-12 bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Create New User</h2>
        <form action={createUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="email" className="block mb-1 font-medium">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full bg-gray-800 rounded-lg p-3 border border-gray-700 focus:border-blue-500 outline-none"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1 font-medium">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full bg-gray-800 rounded-lg p-3 border border-gray-700 focus:border-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="role" className="block mb-1 font-medium">
                Role
              </label>
              <select
                name="role"
                defaultValue="user"
                className="w-full bg-gray-800 rounded-lg p-3 border border-gray-700 focus:border-blue-500 outline-none"
              >
                <option value="user">User</option>
                <option value="superuser">Superuser</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            Create User
          </button>
        </form>
      </div>

      {/* User Management with Projects */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Users & Projects</h2>
        <div className="space-y-4">
          {users.map((user) => {
            const isExpanded = expandedUsers.has(user.id);
            const userProjects = projects[user.id] || [];
            const metadata = user.publicMetadata as UserPublicMetadata;

            return (
              <div key={user.id} className="bg-gray-900 rounded-lg overflow-hidden">
                {/* User Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleUser(user.id)}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-400">
                        {user.emailAddresses[0]?.emailAddress}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span
                        className={`px-3 py-1 rounded-full ${
                          metadata?.role === "superuser"
                            ? "bg-purple-900 text-purple-200"
                            : "bg-gray-800 text-gray-300"
                        }`}
                      >
                        {metadata?.role || "user"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {userProjects.length} project{userProjects.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAddProjectModal(user.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Project
                    </button>
                    <form action={updateUserRole} className="inline">
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={metadata?.role === "superuser" ? "user" : "superuser"}
                      />
                      <button
                        type="submit"
                        disabled={user.id === currentUserId}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        {metadata?.role === "superuser" ? "Make User" : "Make Admin"}
                      </button>
                    </form>
                    <form action={deleteUser} className="inline">
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        disabled={user.id === currentUserId}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                {/* Projects Section */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-4 bg-gray-950">
                    {userProjects.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">
                        No projects yet. Click "Add Project" to create one.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {userProjects.map((project) => (
                          <div
                            key={project.id}
                            className="bg-gray-900 rounded-lg p-4 flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{project.title}</h3>
                              <a
                                href={project.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm break-all"
                              >
                                {project.url}
                              </a>
                              {project.description && (
                                <p className="text-gray-400 text-sm mt-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => openEditProjectModal(project)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                                title="Edit project"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(user.id, project.id)}
                                className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                                title="Delete project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingProject ? "Edit Project" : "Add Project"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitProject} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">Project Title</label>
                <input
                  type="text"
                  value={projectForm.title}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, title: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  placeholder="My Awesome Project"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Project URL</label>
                <input
                  type="url"
                  value={projectForm.url}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, url: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Description (Optional)</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, description: e.target.value })
                  }
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
                  {editingProject ? "Update Project" : "Add Project"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
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
  );
}
