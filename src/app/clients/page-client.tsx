"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Maximize2, Minimize2, Menu, X, UserCircle } from "lucide-react";

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

  // Get current projects based on admin or regular user
  const currentProjects = isAdmin && usersWithProjects && selectedUserId
    ? usersWithProjects.find(u => u.id === selectedUserId)?.projects || []
    : projects || [];

  const [selectedProject, setSelectedProject] = useState<Project | null>(
    currentProjects.length > 0 ? currentProjects[0] : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update selected project when user changes (admin only)
  useEffect(() => {
    if (isAdmin && selectedUserId && usersWithProjects) {
      const user = usersWithProjects.find(u => u.id === selectedUserId);
      if (user && user.projects.length > 0) {
        setSelectedProject(user.projects[0]);
      } else {
        setSelectedProject(null);
      }
    }
  }, [selectedUserId, isAdmin, usersWithProjects]);

  // Load project URL dynamically to hide it from HTML
  useEffect(() => {
    if (selectedProject && iframeRef.current) {
      // Fetch the URL from our proxy endpoint
      fetch(`/api/projects/proxy/${selectedProject.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.url && iframeRef.current) {
            iframeRef.current.src = data.url;
          }
        })
        .catch((error) => {
          console.error('Error loading project:', error);
        });
    }
  }, [selectedProject]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  if (isAdmin && (!usersWithProjects || usersWithProjects.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">No Client Projects</h2>
          <p className="text-gray-400">
            No clients have projects assigned yet. Add projects in the admin dashboard!
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
        {isAdmin && usersWithProjects && usersWithProjects.length > 0 && (
          <div className="p-4 border-b border-gray-800">
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              View Client Projects
            </label>
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
          </div>
        )}

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
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

        {/* Chat Button */}
        <div className="p-4 border-t border-gray-800">
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
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
