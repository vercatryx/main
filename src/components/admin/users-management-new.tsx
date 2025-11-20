"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Mail, Phone, User as UserIcon, Building2, Send, FolderOpen } from "lucide-react";
import type { User, Company } from "@/types/company";
import UserProjectAssignment from "./user-project-assignment";

interface UserWithCompany extends User {
  company: Company;
}

interface UsersManagementProps {
  initialUsers: UserWithCompany[];
  companies: Company[];
  isSuperAdmin: boolean;
  onDataChange?: () => void;
}

export default function UsersManagementNew({ initialUsers, companies, isSuperAdmin, onDataChange }: UsersManagementProps) {
  const [users, setUsers] = useState<UserWithCompany[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithCompany | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigningProjectsUser, setAssigningProjectsUser] = useState<UserWithCompany | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "member" as "admin" | "member",
    company_id: "",
  });

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "member",
      company_id: companies[0]?.id || "",
    });
    setShowModal(true);
  };

  const openEditModal = (user: UserWithCompany) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      role: user.role,
      company_id: user.company_id,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          const updated = await res.json();
          // Fetch company details
          const companyRes = await fetch(`/api/companies/${updated.company_id}`);
          const company = await companyRes.json();

          setUsers(prev => prev.map(u => u.id === updated.id ? { ...updated, company } : u));
          onDataChange?.(); // Trigger page refresh
        } else {
          alert("Failed to update user");
        }
      } else {
        // Create user
        const res = await fetch(`/api/companies/${formData.company_id}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          const response = await res.json();
          const company = companies.find(c => c.id === formData.company_id);
          setUsers(prev => [...prev, { ...response, company: company! }]);
          onDataChange?.(); // Trigger page refresh

          // Show different message based on whether user was linked or invited
          if (response.message) {
            alert(response.message);
          }
        } else {
          alert("Failed to create user");
        }
      }

      closeModal();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
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
        onDataChange?.(); // Trigger page refresh
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

        // If user was linked to existing account, refresh the user list
        if (result.linked) {
          // Fetch updated user data
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Users</h2>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-card/80 rounded-lg border border-border/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Phone</th>
              {isSuperAdmin && (
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Company</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((user) => (
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
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {user.company?.name || 'Unknown'}
                    </div>
                  </td>
                )}
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
                      className="p-1.5 hover:bg-blue-500/20/40 rounded transition-colors text-blue-400"
                      title="Assign projects"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1.5 hover:bg-secondary/60 rounded transition-colors"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-1.5 hover:bg-red-500/20/40 rounded transition-colors text-red-400"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No users found. Click "Add User" to create one.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingUser ? "Edit User" : "Add User"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-secondary/60 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium text-foreground">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-foreground">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block mb-2 font-medium text-foreground">Company *</label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    required
                    className="w-full bg-secondary/80 rounded-lg p-3 border border-border/50 focus:border-blue-600/50 focus:bg-secondary outline-none text-foreground transition-colors"
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

              <div>
                <label className="block mb-2 font-medium text-foreground">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "member" })}
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
                  {loading ? "Saving..." : editingUser ? "Update" : "Create"}
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
          onClose={() => setAssigningProjectsUser(null)}
        />
      )}
    </div>
  );
}
