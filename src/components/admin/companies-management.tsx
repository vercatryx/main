"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Building2, Users, FolderOpen } from "lucide-react";

interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  stats?: {
    users: number;
    projects: number;
    meetings: number;
  };
}

interface CompaniesManagementProps {
  initialCompanies: Company[];
}

export default function CompaniesManagement({ initialCompanies }: CompaniesManagementProps) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setEditingCompany(null);
    setCompanyName("");
    setShowModal(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setCompanyName(company.name);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setCompanyName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        } else {
          alert("Failed to create company");
        }
      }

      closeModal();
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Failed to save company");
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
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <div
            key={company.id}
            className="bg-card/80 rounded-lg p-6 border border-border/50 hover:border-border/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg">{company.name}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(company)}
                  className="p-1.5 hover:bg-secondary/60 rounded transition-colors"
                  title="Edit company"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="p-1.5 hover:bg-red-500/20/40 rounded transition-colors text-red-400"
                  title="Delete company"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </span>
                <span className="font-medium">{company.stats?.users || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Projects
                </span>
                <span className="font-medium">{company.stats?.projects || 0}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Created {new Date(company.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card/95 rounded-lg p-6 max-w-md w-full border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingCompany ? "Edit Company" : "Add Company"}
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
                  {loading ? "Saving..." : editingCompany ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
