"use client";

import { useState, useEffect } from "react";
import { X, FolderOpen, Check } from "lucide-react";

interface Project {
  id: string;
  title: string;
  companyId: string;
}

interface UserProjectAssignmentProps {
  userId: string;
  userName: string;
  companyId: string;
  onClose: () => void;
}

export default function UserProjectAssignment({
  userId,
  userName,
  companyId,
  onClose
}: UserProjectAssignmentProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [allProjectsAccess, setAllProjectsAccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch company projects
        const projectsRes = await fetch(`/api/companies/${companyId}/projects`);
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(Array.isArray(data) ? data : data.projects || []);
        }

        // Fetch user's current permissions
        const permissionsRes = await fetch(`/api/users/${userId}/projects`);
        if (permissionsRes.ok) {
          const data = await permissionsRes.json();
          setAssignedProjectIds(data.projectIds || []);
        }

        // Fetch user's all_projects_access status
        const userRes = await fetch(`/api/users/${userId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setAllProjectsAccess(userData.all_projects_access || false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, companyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all_projects_access
      const userUpdateRes = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          all_projects_access: allProjectsAccess,
        }),
      });

      if (!userUpdateRes.ok) {
        alert('Failed to update user access settings');
        return;
      }

      // Update specific project permissions (only if not all projects access)
      if (!allProjectsAccess) {
        const permissionsRes = await fetch(`/api/users/${userId}/projects`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectIds: assignedProjectIds,
          }),
        });

        if (!permissionsRes.ok) {
          alert('Failed to update project permissions');
          return;
        }
      }

      alert('Project assignments updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const toggleProject = (projectId: string) => {
    if (assignedProjectIds.includes(projectId)) {
      setAssignedProjectIds(assignedProjectIds.filter(id => id !== projectId));
    } else {
      setAssignedProjectIds([...assignedProjectIds, projectId]);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg p-6 max-w-2xl w-full border border-border max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Assign Projects</h3>
            <p className="text-sm text-muted-foreground mt-1">Managing access for {userName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {/* All Projects Access Toggle */}
            <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allProjectsAccess}
                  onChange={(e) => setAllProjectsAccess(e.target.checked)}
                  className="w-5 h-5 mt-0.5"
                />
                <div>
                  <div className="text-foreground font-medium">Grant Access to All Projects</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    User will automatically have access to all current and future projects in the company.
                  </p>
                </div>
              </label>
            </div>

            {/* Individual Project Selection */}
            {!allProjectsAccess && (
              <div>
                <h4 className="text-foreground font-medium mb-3">Select Specific Projects</h4>
                {projects.length === 0 ? (
                  <div className="text-center py-8 bg-secondary/30 rounded-lg border border-border">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No projects available in this company</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {projects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-3 p-3 hover:bg-secondary rounded cursor-pointer border border-border"
                      >
                        <input
                          type="checkbox"
                          checked={assignedProjectIds.includes(project.id)}
                          onChange={() => toggleProject(project.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <FolderOpen className="w-4 h-4 text-blue-400" />
                          <span className="text-foreground">{project.title}</span>
                        </div>
                        {assignedProjectIds.includes(project.id) && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 p-4 bg-blue-500/20/20 border border-blue-500/50 rounded-lg">
              <p className="text-blue-400 text-sm">
                {allProjectsAccess ? (
                  <>User will have access to <strong>all projects</strong> in the company</>
                ) : (
                  <>User will have access to <strong>{assignedProjectIds.length} project{assignedProjectIds.length !== 1 ? 's' : ''}</strong></>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-secondary border border-border text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-500 text-foreground rounded-lg transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
