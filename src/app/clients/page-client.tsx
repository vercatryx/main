"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MessageCircle, Maximize2, Minimize2, Menu, X, UserCircle, LogOut, Send } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton, useUser, useAuth } from "@clerk/nextjs";

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

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export default function ClientPortal({ projects, userName, isAdmin, usersWithProjects }: ClientPortalProps) {
  // For admin: track selected user and get their projects
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    isAdmin && usersWithProjects && usersWithProjects.length > 0
      ? usersWithProjects[0].id
      : null
  );

  // Create admin project for admins (useMemo to prevent infinite loop)
  const adminProject: Project | null = useMemo(() =>
    isAdmin ? {
      id: 'admin-dashboard',
      userId: 'admin',
      title: 'Admin',
      url: '/admin',
      description: 'User Management Dashboard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : null,
    [isAdmin]
  );

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
  const [chatState, setChatState] = useState<'closed' | 'sidebar' | 'expanded'>('closed');
  const [chatProjectId, setChatProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (chatProjectId) {
      const fetchMessages = async () => {
        const res = await fetch(`/api/chat/${chatProjectId}`);
        const data = await res.json();
        setMessages(data);
      };
      fetchMessages();
    }
  }, [chatProjectId]);
  
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

  const getProjectForChat = () => currentProjects.find(p => p.id === chatProjectId);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-80' : 'w-0'
        } bg-gray-900 border-r border-gray-800 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {chatState === 'sidebar' ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-800 bg-blue-800">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">
                  {getProjectForChat()?.title}
                </h3>
                <div>
                  <button
                    onClick={() => setChatState('expanded')}
                    className="p-2 hover:bg-blue-700 rounded-lg"
                    title="Expand chat"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setChatState('closed')}
                    className="p-2 hover:bg-blue-700 rounded-lg"
                    title="Close chat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-200">
                {getProjectForChat()?.description}
              </p>
            </div>
            {/* Chat Content */}
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto flex flex-col">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.userId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 max-w-xs ${
                        msg.userId === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      <p className="font-bold text-sm">{msg.userName}</p>
                      <p>{msg.message}</p>
                      <p className="text-xs opacity-70 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Chat Input */}
            <div className="p-4 border-t border-gray-800">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('message') as HTMLInputElement;
                  const message = input.value;
                  if (message.trim() && chatProjectId) {
                    const res = await fetch(`/api/chat/${chatProjectId}`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        message,
                        userId: user?.id,
                        userName: user?.fullName,
                      }),
                    });
                    if (res.ok) {
                      const newMessage = await res.json();
                      setMessages((prev) => [...prev, newMessage]);
                      input.value = '';
                    }
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  name="message"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>

          </>
        ) : (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-1">Welcome, {userName}!</h2>
                <p className="text-sm text-gray-400">
                  {isAdmin ? 'Admin View - All Projects' : 'Your Projects'}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-800 rounded-full">
                    <UserCircle className="w-6 h-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <SignOutButton>
                    <DropdownMenuItem className="text-red-500 hover:!text-red-500 hover:!bg-red-500/10 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </SignOutButton>
                </DropdownMenuContent>
              </DropdownMenu>
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
                <div key={project.id} className="relative">
                  <button
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
                  {selectedProject?.id === project.id && project.id !== 'admin-dashboard' && (
                    <button
                      onClick={() => {
                        if (chatState === 'closed') {
                          setChatState('sidebar');
                          setChatProjectId(project.id);
                        } else {
                          setChatState('closed');
                          setChatProjectId(null);
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-gray-700 rounded-full hover:bg-gray-600"
                    >
                      {chatState === 'closed' ? (
                        <MessageCircle className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Button & Logout */}

          </>
        )}
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
          {chatState === 'expanded' ? (
            <div className="w-full h-full bg-gray-800 flex flex-col">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-bold">
                  {getProjectForChat()?.title}
                </h3>
                <div>
                  <button
                    onClick={() => setChatState('sidebar')}
                    className="p-2 hover:bg-gray-700 rounded-lg"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setChatState('closed')}
                    className="p-2 hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto flex flex-col">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.userId === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-3 py-2 max-w-xs ${
                          msg.userId === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        <p className="font-bold text-sm">{msg.userName}</p>
                        <p>{msg.message}</p>
                        <p className="text-xs opacity-70 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-700">
                <form
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      const form = e.currentTarget;
                                      const input = form.elements.namedItem('message') as HTMLInputElement;
                                      const message = input.value;
                                                          if (message.trim() && chatProjectId) {
                                                            const res = await fetch(`/api/chat/${chatProjectId}`, {
                                                              method: 'POST',
                                                              headers: {
                                                                'Content-Type': 'application/json',
                                                              },
                                                              body: JSON.stringify({
                                                                message,
                                                                userId: user?.id,
                                                                userName: user?.fullName,
                                                              }),
                                                            });                                        if (res.ok) {
                                          const newMessage = await res.json();
                                          setMessages((prev) => [...prev, newMessage]);
                                          input.value = '';
                                        }
                                      }
                                    }}                  className="flex items-center gap-2"
                >
                  <input
                    name="message"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                    placeholder="Type a message..."
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          ) : selectedProject ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title={selectedProject.title}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-downloads allow-modals allow-pointer-lock allow-presentation"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; microphone; camera; geolocation; payment"
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
