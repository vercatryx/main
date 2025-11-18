"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Maximize2, Minimize2, Menu, X, UserCircle, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

interface Project {
  id: string;
  userId: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserWithProjects {
  id: string;
  name: string;
  email: string;
  projects: Project[];
}

interface ClientPortalProps {
  userName: string;
  isAdmin: boolean;
  projects?: Project[];
  usersWithProjects?: UserWithProjects[];
}

export default function ClientPortal({ projects, userName, isAdmin, usersWithProjects }: ClientPortalProps) {
  // For admin: track selected user and get their projects
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    isAdmin && usersWithProjects && usersWithProjects.length > 0
      ? usersWithProjects[0].id
      : null
  );

  // Create admin project for admins
  const adminProject: Project | null = isAdmin ? {
    id: 'admin-dashboard',
    userId: 'admin',
    title: 'Admin',
    url: '/admin',
    description: 'User Management Dashboard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } : null;

  // Get current projects based on admin or regular user
  const userProjects = isAdmin && usersWithProjects && selectedUserId
    ? usersWithProjects.find(u => u.id === selectedUserId)?.projects || []
    : projects || [];

  // For admins, prepend the admin project to the list
  const currentProjects = isAdmin && adminProject
    ? [adminProject, ...userProjects]
    : userProjects;

  const [selectedProject, setSelectedProject] = useState<Project | null>(
    currentProjects.length > 0 ? currentProjects[0] : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update selected project when user changes (admin only)
  useEffect(() => {
    if (isAdmin && selectedUserId && usersWithProjects && adminProject) {
      // Always default to admin dashboard when user changes
      setSelectedProject(adminProject);
    }
  }, [selectedUserId, isAdmin, usersWithProjects, adminProject]);

  // Debug: Log when selectedProject changes
  useEffect(() => {
    console.log('📌 Selected project changed:', selectedProject?.title, selectedProject?.id);
  }, [selectedProject]);

  // Load project URL dynamically to hide it from HTML
  useEffect(() => {
    if (selectedProject && iframeRef.current) {
      console.log('Loading project:', selectedProject.title, selectedProject.id);

      // For admin dashboard, load URL directly
      if (selectedProject.id === 'admin-dashboard') {
        console.log('Loading admin dashboard at:', selectedProject.url);
        iframeRef.current.src = selectedProject.url;
      } else {
        // For regular projects, fetch the URL from our proxy endpoint
        console.log('Fetching project URL from proxy for:', selectedProject.id);
        fetch(`/api/projects/proxy/${selectedProject.id}`)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then((data) => {
            console.log('Received URL from proxy:', data.url);
            if (data.url && iframeRef.current) {
              iframeRef.current.src = data.url;
            }
          })
          .catch((error) => {
            console.error('Error loading project:', error);
          });
      }
    }
  }, [selectedProject]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen and hide sidebar
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setIsSidebarOpen(false);
    } else {
      // Exit fullscreen and show sidebar
      document.exitFullscreen();
      setIsFullscreen(false);
      setIsSidebarOpen(true);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // Hide sidebar when entering fullscreen, show when exiting
      if (isNowFullscreen) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Only show "no projects" message for regular users (admins always have the Admin project)
  if (currentProjects.length === 0 && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">No Projects Yet</h2>
          <p className="text-gray-400">
            Your admin will add projects for you soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-80' : 'w-0'
        } bg-gray-900 border-r border-gray-800 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold mb-1">Welcome, {userName}!</h2>
          <p className="text-sm text-gray-400">
            {isAdmin ? 'Admin View - All Projects' : 'Your Projects'}
          </p>
        </div>

        {/* Admin User Selector */}
        {isAdmin && (
          <div className="p-4 border-b border-gray-800">
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              View Client Projects
            </label>
            {usersWithProjects && usersWithProjects.length > 0 ? (
              <>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                >
                  {usersWithProjects.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.projects.length} project{user.projects.length !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
                {selectedUserId && (
                  <p className="text-xs text-gray-500 mt-1">
                    {usersWithProjects.find(u => u.id === selectedUserId)?.email}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No clients have projects yet. Use the Admin dashboard to add projects.
              </p>
            )}
          </div>
        )}

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                console.log('🖱️ Project clicked:', project.title, project.id);
                setSelectedProject(project);
              }}
              className={`w-full text-left p-4 rounded-lg transition-colors ${
                selectedProject?.id === project.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <h3 className="font-semibold mb-1">{project.title}</h3>
              {project.description && (
                <p className="text-sm opacity-80 line-clamp-2">
                  {project.description}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Chat Button & Logout */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chat with Support</span>
          </button>
          {showChat && (
            <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg text-sm text-yellow-200">
              Chat feature coming soon!
            </div>
          )}

          {/* Logout Button */}
          <SignOutButton>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium">
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Project Title */}
            {selectedProject && (
              <div>
                <h1 className="font-semibold text-lg">
                  {selectedProject.title}
                </h1>
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="text-sm">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm">Fullscreen</span>
              </>
            )}
          </button>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 bg-white relative">
          {selectedProject ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title={selectedProject.title}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onLoad={() => console.log('✅ Iframe loaded successfully')}
              onError={(e) => console.error('❌ Iframe error:', e)}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-950 text-white">
              <p className="text-gray-400">Select a project from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
