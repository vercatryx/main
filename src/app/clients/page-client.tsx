"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Maximize2, Minimize2, Menu, X, UserCircle, LogOut, Send, Paperclip, File as FileIcon, Download, Image as ImageIcon, Trash2, Mic, Square } from "lucide-react";
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

interface ChatAttachment {
  type: 'image' | 'file' | 'voice';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  attachments?: ChatAttachment[];
}

export default function ClientPortal({ projects, userName, isAdmin, usersWithProjects }: ClientPortalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // For admin: track selected user and get their projects
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    if (isAdmin && usersWithProjects && usersWithProjects.length > 0) {
      const userIdFromUrl = searchParams.get('userId');
      if (userIdFromUrl && usersWithProjects.find(u => u.id === userIdFromUrl)) {
        return userIdFromUrl;
      }
      return usersWithProjects[0].id;
    }
    return null;
  });

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

  // Helper function to update URL
  const updateURL = (params: { projectId?: string; chat?: string; chatState?: string; userId?: string }) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (params.projectId) {
      newParams.set('project', params.projectId);
    }
    if (params.chat !== undefined) {
      if (params.chat) {
        newParams.set('chat', params.chat);
      } else {
        newParams.delete('chat');
      }
    }
    if (params.chatState !== undefined) {
      if (params.chatState && params.chatState !== 'closed') {
        newParams.set('chatState', params.chatState);
      } else {
        newParams.delete('chatState');
      }
    }
    if (params.userId) {
      newParams.set('userId', params.userId);
    }

    router.replace(`/clients?${newParams.toString()}`, { scroll: false });
  };

  // Initialize state from URL params or defaults
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    const projectIdFromUrl = searchParams.get('project');
    if (projectIdFromUrl && currentProjects.length > 0) {
      const project = currentProjects.find(p => p.id === projectIdFromUrl);
      return project || (currentProjects.length > 0 ? currentProjects[0] : null);
    }
    return currentProjects.length > 0 ? currentProjects[0] : null;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatState, setChatState] = useState<'closed' | 'sidebar' | 'expanded'>(() => {
    const chatStateFromUrl = searchParams.get('chatState');
    return (chatStateFromUrl as 'closed' | 'sidebar' | 'expanded') || 'closed';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [chatProjectId, setChatProjectId] = useState<string | null>(() => {
    return searchParams.get('chat') || null;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const previousMessageCountRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { user } = useUser();
  const { getToken } = useAuth();

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync selected project to URL
  useEffect(() => {
    if (selectedProject) {
      updateURL({ projectId: selectedProject.id });
    }
  }, [selectedProject?.id]);

  // Sync chat state to URL
  useEffect(() => {
    updateURL({
      chat: chatProjectId || undefined,
      chatState: chatState
    });
  }, [chatProjectId, chatState]);

  // Sync selected user (admin only) to URL
  useEffect(() => {
    if (isAdmin && selectedUserId) {
      updateURL({ userId: selectedUserId });
    }
  }, [selectedUserId, isAdmin]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Only auto-scroll if:
    // 1. New messages were added (message count increased)
    // 2. User is scrolled near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    const hasNewMessages = messages.length > previousMessageCountRef.current;

    if (hasNewMessages && isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }

    previousMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (chatProjectId) {
      const fetchMessages = async () => {
        const res = await fetch(`/api/chat/${chatProjectId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        const data = await res.json();
        setMessages(data);
      };

      // Initial fetch
      fetchMessages();

      // Poll for new messages every 2 seconds when chat is open
      const pollInterval = setInterval(() => {
        if (chatState !== 'closed') {
          fetchMessages();
        }
      }, 2000);

      // Cleanup interval on unmount or when chatProjectId changes
      return () => clearInterval(pollInterval);
    }
  }, [chatProjectId, chatState]);
  
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    // Focus the message input after selecting files
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('message') as HTMLInputElement;
    const message = input.value;

    if ((!message.trim() && selectedFiles.length === 0) || !chatProjectId) {
      return;
    }

    try {
      setUploadingFiles(true);

      // Generate message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Upload files first if any
      const attachments: ChatAttachment[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('messageId', messageId);

        const uploadRes = await fetch(`/api/chat/${chatProjectId}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const error = await uploadRes.json();
          throw new Error(error.error || 'Upload failed');
        }

        const attachment = await uploadRes.json();
        attachments.push(attachment);
      }

      // Send message with attachments
      const res = await fetch(`/api/chat/${chatProjectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message || '',
          userId: user?.id,
          userName: user?.fullName,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        input.value = '';
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setUploadingFiles(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try different MIME types for better mobile compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to default
        mimeType = '';
      }

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      const actualMimeType = mediaRecorder.mimeType;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendVoiceNote = async () => {
    if (!audioBlob || !chatProjectId) return;

    try {
      setUploadingFiles(true);

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get file extension from MIME type
      let extension = 'webm';
      if (audioBlob.type.includes('mp4')) {
        extension = 'mp4';
      } else if (audioBlob.type.includes('ogg')) {
        extension = 'ogg';
      } else if (audioBlob.type.includes('wav')) {
        extension = 'wav';
      }

      const filename = `voice-${Date.now()}.${extension}`;
      const file = new File([audioBlob], filename, { type: audioBlob.type });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('messageId', messageId);

      const uploadRes = await fetch(`/api/chat/${chatProjectId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || 'Upload failed');
      }

      const attachment = await uploadRes.json();
      attachment.duration = recordingTime;

      const res = await fetch(`/api/chat/${chatProjectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '',
          userId: user?.id,
          userName: user?.fullName,
          attachments: [attachment],
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setAudioBlob(null);
        setRecordingTime(0);
      }
    } catch (error) {
      console.error('Error sending voice note:', error);
      alert(error instanceof Error ? error.message : 'Failed to send voice note');
    } finally {
      setUploadingFiles(false);
    }
  };

  const deleteAttachment = async (messageId: string, attachmentUrl: string, attachmentFilename: string) => {
    if (!chatProjectId || !isAdmin) return;

    if (!confirm('Delete this attachment? This cannot be undone.')) return;

    try {
      // Immediately update UI to show deletion
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.id === messageId && msg.attachments) {
            const remainingAttachments = msg.attachments.filter(att => att.url !== attachmentUrl);

            // If no attachments left and no message text, replace with deletion notice
            if (remainingAttachments.length === 0 && (!msg.message || !msg.message.trim())) {
              return {
                ...msg,
                message: `"${attachmentFilename}" was deleted`,
                attachments: undefined
              };
            }

            return {
              ...msg,
              attachments: remainingAttachments.length > 0 ? remainingAttachments : undefined
            };
          }
          return msg;
        })
      );

      // Delete on server in background
      const res = await fetch(`/api/chat/${chatProjectId}/delete-attachment`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, attachmentUrl }),
      });

      if (res.ok) {
        // Give the server time to delete old blobs and create new one
        await new Promise(resolve => setTimeout(resolve, 600));

        // Fetch fresh data from server to ensure sync
        const refreshRes = await fetch(`/api/chat/${chatProjectId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (refreshRes.ok) {
          const updatedMessages = await refreshRes.json();
          console.log('Server sync: Updated messages received:', updatedMessages.length, 'messages');
          setMessages(updatedMessages);
        } else {
          console.error('Failed to fetch after deletion');
        }
      } else {
        // Revert the optimistic update on error
        alert('Failed to delete attachment');
        const refreshRes = await fetch(`/api/chat/${chatProjectId}?t=${Date.now()}`);
        if (refreshRes.ok) {
          const updatedMessages = await refreshRes.json();
          setMessages(updatedMessages);
        }
      }
    } catch (error) {
      console.error('Delete attachment error:', error);
      alert('Failed to delete attachment');
      // Revert optimistic update
      const refreshRes = await fetch(`/api/chat/${chatProjectId}?t=${Date.now()}`);
      if (refreshRes.ok) {
        const updatedMessages = await refreshRes.json();
        setMessages(updatedMessages);
      }
    }
  };

  const deleteEntireChat = async () => {
    if (!chatProjectId || !isAdmin) return;

    if (!confirm('Delete entire chat history? This will delete all messages and attachments. This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/chat/${chatProjectId}/delete`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessages([]);
        alert('Chat deleted successfully');
      } else {
        alert('Failed to delete chat');
      }
    } catch (error) {
      console.error('Delete chat error:', error);
      alert('Failed to delete chat');
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar - full width on mobile, toggleable on desktop */}
      <div
        className={`${
          isMobile ? 'w-full' : isSidebarOpen ? 'w-80' : 'w-0'
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
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <button
                      onClick={deleteEntireChat}
                      className="p-2 hover:bg-red-700 rounded-lg text-red-200"
                      title="Delete entire chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                      {msg.message && msg.message.trim() && (
                        <p className={msg.message.includes('was deleted') ? 'italic text-gray-400' : ''}>
                          {msg.message}
                        </p>
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={msg.message && msg.message.trim() ? "mt-2 space-y-2" : "space-y-2"}>
                          {msg.attachments.map((attachment, idx) => (
                            <div key={idx} className="relative group">
                              {attachment.type === 'image' ? (
                                <div className="relative">
                                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={attachment.url}
                                      alt={attachment.filename}
                                      className="max-w-full rounded border border-gray-600"
                                      style={{ maxHeight: '200px' }}
                                    />
                                  </a>
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Delete attachment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ) : attachment.type === 'voice' ? (
                                <div className="flex items-center gap-2 bg-gray-600 rounded px-3 py-2">
                                  <Mic className="w-4 h-4 text-blue-400" />
                                  <audio
                                    controls
                                    preload="metadata"
                                    controlsList="nodownload"
                                    className="h-8 flex-1"
                                    style={{ maxWidth: '200px' }}
                                  >
                                    <source src={attachment.url} type={attachment.mimeType} />
                                    Your browser does not support audio playback.
                                  </audio>
                                  {attachment.duration && (
                                    <span className="text-xs text-gray-400">{formatTime(attachment.duration)}</span>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                      className="text-red-400 hover:text-red-300"
                                      title="Delete voice note"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 bg-gray-600 rounded px-2 py-1 text-xs">
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 flex-1 hover:text-gray-300"
                                  >
                                    <FileIcon className="w-4 h-4" />
                                    <span className="flex-1 truncate">{attachment.filename}</span>
                                    <Download className="w-3 h-3" />
                                  </a>
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                      className="text-red-400 hover:text-red-300 ml-1"
                                      title="Delete attachment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs opacity-70 text-right mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Chat Input */}
            <div className="p-4 border-t border-gray-800">
              {selectedFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1 text-xs">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-3 h-3" />
                      ) : (
                        <FileIcon className="w-3 h-3" />
                      )}
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-gray-400">{formatFileSize(file.size)}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {audioBlob && (
                <div className="mb-2 bg-gray-700 rounded px-3 py-2 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-400" />
                  <span className="text-sm flex-1">Voice note ({formatTime(recordingTime)})</span>
                  <button
                    onClick={sendVoiceNote}
                    className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-xs"
                    disabled={uploadingFiles}
                  >
                    Send
                  </button>
                  <button
                    onClick={cancelRecording}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isRecording && (
                <div className="mb-2 bg-red-900/20 border border-red-600 rounded px-3 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm flex-1">Recording... {formatTime(recordingTime)}</span>
                  <button
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700 rounded-lg p-2"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2"
                  disabled={uploadingFiles || isRecording}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${
                    isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                  } rounded-lg p-2`}
                  disabled={uploadingFiles || audioBlob !== null}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  ref={messageInputRef}
                  name="message"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="Type a message..."
                  disabled={uploadingFiles || isRecording}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2 disabled:opacity-50"
                  disabled={uploadingFiles || isRecording}
                >
                  {uploadingFiles ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>

          </>
        ) : chatState === 'expanded' && isMobile ? (
          /* Mobile Expanded Chat - takes over entire screen */
          <div className="w-full h-full bg-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold">
                {getProjectForChat()?.title}
              </h3>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={deleteEntireChat}
                    className="p-2 hover:bg-red-700 rounded-lg text-red-400"
                    title="Delete entire chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
                      className={`rounded-lg px-3 py-2 max-w-md ${
                        msg.userId === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      {msg.message && msg.message.trim() && (
                        <p className={msg.message.includes('was deleted') ? 'italic text-gray-400' : ''}>
                          {msg.message}
                        </p>
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={msg.message && msg.message.trim() ? "mt-2 space-y-2" : "space-y-2"}>
                          {msg.attachments.map((attachment, idx) => (
                            <div key={idx} className="relative group">
                              {attachment.type === 'image' ? (
                                <div className="relative">
                                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={attachment.url}
                                      alt={attachment.filename}
                                      className="max-w-full rounded border border-gray-600"
                                      style={{ maxHeight: '300px' }}
                                    />
                                  </a>
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Delete attachment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ) : attachment.type === 'voice' ? (
                                <div className="flex items-center gap-2 bg-gray-600 rounded px-3 py-2">
                                  <Mic className="w-4 h-4 text-blue-400" />
                                  <audio
                                    controls
                                    preload="metadata"
                                    controlsList="nodownload"
                                    className="h-8 flex-1"
                                    style={{ maxWidth: '200px' }}
                                  >
                                    <source src={attachment.url} type={attachment.mimeType} />
                                    Your browser does not support audio playback.
                                  </audio>
                                  {attachment.duration && (
                                    <span className="text-xs text-gray-400">{formatTime(attachment.duration)}</span>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                      className="text-red-400 hover:text-red-300"
                                      title="Delete voice note"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 bg-gray-600 rounded px-2 py-1 text-xs">
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 flex-1 hover:text-gray-300"
                                  >
                                    <FileIcon className="w-4 h-4" />
                                    <span className="flex-1 truncate">{attachment.filename}</span>
                                    <Download className="w-3 h-3" />
                                  </a>
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                      className="text-red-400 hover:text-red-300 ml-1"
                                      title="Delete attachment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs opacity-70 text-right mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-700">
              {selectedFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1 text-xs">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-3 h-3" />
                      ) : (
                        <FileIcon className="w-3 h-3" />
                      )}
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-gray-400">{formatFileSize(file.size)}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {audioBlob && (
                <div className="mb-2 bg-gray-700 rounded px-3 py-2 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-400" />
                  <span className="text-sm flex-1">Voice note ({formatTime(recordingTime)})</span>
                  <button
                    onClick={sendVoiceNote}
                    className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-xs"
                    disabled={uploadingFiles}
                  >
                    Send
                  </button>
                  <button
                    onClick={cancelRecording}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isRecording && (
                <div className="mb-2 bg-red-900/20 border border-red-600 rounded px-3 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm flex-1">Recording... {formatTime(recordingTime)}</span>
                  <button
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700 rounded-lg p-2"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2"
                  disabled={uploadingFiles || isRecording}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${
                    isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                  } rounded-lg p-2`}
                  disabled={uploadingFiles || audioBlob !== null}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  ref={messageInputRef}
                  name="message"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="Type a message..."
                  disabled={uploadingFiles || isRecording}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2 disabled:opacity-50"
                  disabled={uploadingFiles || isRecording}
                >
                  {uploadingFiles ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </div>
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

      {/* Main Content Area - hidden on mobile */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
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
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <button
                      onClick={deleteEntireChat}
                      className="p-2 hover:bg-red-700 rounded-lg text-red-400"
                      title="Delete entire chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                        className={`rounded-lg px-3 py-2 max-w-md ${
                          msg.userId === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        {msg.message && msg.message.trim() && (
                        <p className={msg.message.includes('was deleted') ? 'italic text-gray-400' : ''}>
                          {msg.message}
                        </p>
                      )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={msg.message && msg.message.trim() ? "mt-2 space-y-2" : "space-y-2"}>
                            {msg.attachments.map((attachment, idx) => (
                              <div key={idx} className="relative group">
                                {attachment.type === 'image' ? (
                                  <div className="relative">
                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={attachment.url}
                                        alt={attachment.filename}
                                        className="max-w-full rounded border border-gray-600"
                                        style={{ maxHeight: '300px' }}
                                      />
                                    </a>
                                    {isAdmin && (
                                      <button
                                        onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete attachment"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : attachment.type === 'voice' ? (
                                  <div className="flex items-center gap-2 bg-gray-600 rounded px-3 py-2">
                                    <Mic className="w-4 h-4 text-blue-400" />
                                    <audio controls className="h-8 flex-1" style={{ maxWidth: '200px' }}>
                                      <source src={attachment.url} type={attachment.mimeType} />
                                    </audio>
                                    {attachment.duration && (
                                      <span className="text-xs text-gray-400">{formatTime(attachment.duration)}</span>
                                    )}
                                    {isAdmin && (
                                      <button
                                        onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                        className="text-red-400 hover:text-red-300"
                                        title="Delete voice note"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 bg-gray-600 rounded px-2 py-1 text-xs">
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 flex-1 hover:text-gray-300"
                                    >
                                      <FileIcon className="w-4 h-4" />
                                      <span className="flex-1 truncate">{attachment.filename}</span>
                                      <Download className="w-3 h-3" />
                                    </a>
                                    {isAdmin && (
                                      <button
                                        onClick={() => deleteAttachment(msg.id, attachment.url, attachment.filename)}
                                        className="text-red-400 hover:text-red-300 ml-1"
                                        title="Delete attachment"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-70 text-right mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-700">
                {selectedFiles.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1 text-xs">
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="w-3 h-3" />
                        ) : (
                          <FileIcon className="w-3 h-3" />
                        )}
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-gray-400">{formatFileSize(file.size)}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {audioBlob && (
                  <div className="mb-2 bg-gray-700 rounded px-3 py-2 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-400" />
                    <span className="text-sm flex-1">Voice note ({formatTime(recordingTime)})</span>
                    <button
                      onClick={sendVoiceNote}
                      className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-xs"
                      disabled={uploadingFiles}
                    >
                      Send
                    </button>
                    <button
                      onClick={cancelRecording}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {isRecording && (
                  <div className="mb-2 bg-red-900/20 border border-red-600 rounded px-3 py-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-sm flex-1">Recording... {formatTime(recordingTime)}</span>
                    <button
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 rounded-lg p-2"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2"
                    disabled={uploadingFiles || isRecording}
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`${
                      isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                    } rounded-lg p-2`}
                    disabled={uploadingFiles || audioBlob !== null}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <input
                    name="message"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                    placeholder="Type a message..."
                    disabled={uploadingFiles || isRecording}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2 disabled:opacity-50"
                    disabled={uploadingFiles || isRecording}
                  >
                    {uploadingFiles ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
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
              allow="accelerometer; autoplay; clipboard-write; clipboard-read; encrypted-media; gyroscope; picture-in-picture; fullscreen; microphone; camera; geolocation; payment; storage-access-by-user-activation"
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
