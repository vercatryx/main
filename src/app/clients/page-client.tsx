"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Maximize2, Minimize2, Menu, X, UserCircle, LogOut, Send, Paperclip, File as FileIcon, Download, Image as ImageIcon, Trash2, Mic, Square, Video, Calendar, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton, useUser, useAuth } from "@clerk/nextjs";
import MeetingsModal from "@/components/client/meetings-modal";

interface Project {
  id: string;
  companyId?: string;
  userId?: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserWithCompany {
  id: string;
  company_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: 'admin' | 'member';
  is_active: boolean;
  company: {
    id: string;
    name: string;
  };
}

interface ClientPortalProps {
  userName: string;
  companyName: string;
  projects: Project[];
  user: UserWithCompany;
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

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  jitsiRoomName: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export default function ClientPortal({ projects, userName, companyName, user }: ClientPortalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = user.role === 'admin';

  // Create admin project for company admins
  const adminProject: Project | null = useMemo(() =>
    user.role === 'admin' ? {
      id: 'admin-dashboard',
      title: 'Admin',
      url: '/admin',
      description: 'User Management Dashboard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : null,
    [user.role]
  );

  // For company admins, prepend the admin project to the list
  const currentProjects = adminProject
    ? [adminProject, ...projects]
    : projects;

  // Helper function to update URL
  const updateURL = useCallback((params: { chat?: string; chatState?: string; userId?: string; project?: string }) => {
    const newParams = new URLSearchParams(searchParams.toString());

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
    if (params.userId !== undefined) {
      if (params.userId) {
        newParams.set('userId', params.userId);
      } else {
        newParams.delete('userId');
      }
    }
    if (params.project !== undefined) {
      if (params.project) {
        newParams.set('project', params.project);
      } else {
        newParams.delete('project');
      }
    }

    router.replace(`/clients?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Initialize state from URL params or defaults
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
  const projectIdFromUrlRef = useRef<string | null>(searchParams.get('project'));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [upcomingMeeting, setUpcomingMeeting] = useState<Meeting | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const previousMessageCountRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const hasInitialized = useRef(false);

  // Initialize selected project from URL or default
  useEffect(() => {
    if (currentProjects.length > 0 && !hasInitialized.current) {
      const projectIdFromUrl = projectIdFromUrlRef.current;

      // Try to find the project from URL
      if (projectIdFromUrl) {
        const projectFromUrl = currentProjects.find(p => p.id === projectIdFromUrl);
        if (projectFromUrl) {
          console.log('🔄 Restoring project from URL:', projectFromUrl.title, projectFromUrl.id);
          setSelectedProject(projectFromUrl);
          hasInitialized.current = true;
          return;
        } else {
          console.log('⚠️ Project from URL not found:', projectIdFromUrl);
        }
      }

      // Default: If there is more than one project, and the first one is the admin dashboard, select the second one.
      console.log('🆕 No URL project found, using default');
      if (currentProjects.length > 1 && currentProjects[0].id === 'admin-dashboard') {
        setSelectedProject(currentProjects[1]);
      } else {
        setSelectedProject(currentProjects[0]);
      }
      hasInitialized.current = true;
    }
  }, [currentProjects]);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync state to URL (combined to prevent race conditions)
  useEffect(() => {
    if (hasInitialized.current) {
      updateURL({
        chat: chatProjectId || undefined,
        chatState: chatState,
        project: selectedProject?.id || undefined,
      });
    }
  }, [chatProjectId, chatState, selectedProject, updateURL]);

  // Fetch upcoming meeting
  useEffect(() => {
      const fetchUpcomingMeeting = async () => {
        try {
          const res = await fetch('/api/meetings/upcoming');
          if (res.ok) {
            const data = await res.json();
            // Get the first meeting that's within 3 hours
            const now = new Date();
            const upcomingMeetings = data.meetings.filter((meeting: Meeting) => {
              const scheduledDate = new Date(meeting.scheduledAt);
              const joinWindowStart = new Date(scheduledDate.getTime() - 30 * 60 * 1000); // 30 min before
              const joinWindowEnd = new Date(scheduledDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after
              return now >= joinWindowStart && now <= joinWindowEnd;
            });
            setUpcomingMeeting(upcomingMeetings[0] || null);
          }
        } catch (error) {
          console.error('Error fetching upcoming meeting:', error);
        }
      };

      fetchUpcomingMeeting();
      // Refresh every minute
      const interval = setInterval(fetchUpcomingMeeting, 60000);
      return () => clearInterval(interval);
  }, []);

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

      // Poll for new messages every 5 seconds when chat is open
      const pollInterval = setInterval(() => {
        if (chatState !== 'closed') {
          fetchMessages();
        }
      }, 5000);

      // Cleanup interval on unmount or when chatProjectId changes
      return () => clearInterval(pollInterval);
    }
  }, [chatProjectId, chatState]);

  // Debug: Log when selectedProject changes
  useEffect(() => {
    console.log('📌 Selected project changed:', selectedProject?.title, selectedProject?.id);
  }, [selectedProject]);

  // Load project URL dynamically to hide it from HTML
  useEffect(() => {
    if (selectedProject && iframeRef.current) {
      console.log('Loading project:', selectedProject.title, selectedProject.id);
      setIsProjectLoading(true);

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
            setIsProjectLoading(false);
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
  if (currentProjects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">No Projects Yet</h2>
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
          userId: clerkUser?.id,
          userName: clerkUser?.fullName,
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
          userId: clerkUser?.id,
          userName: clerkUser?.fullName,
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
        } bg-gray-950 border-r border-gray-800/50 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {chatState === 'sidebar' ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-800/50 bg-gray-900/60">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-gray-100">
                  {getProjectForChat()?.title}
                </h3>
                <div className="flex items-center gap-1">
                  {user.role === 'admin' && (
                    <button
                      onClick={deleteEntireChat}
                      className="p-2 hover:bg-red-900/40 rounded-lg text-red-300 transition-colors"
                      title="Delete entire chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setChatState('expanded')}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    title="Expand chat"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setChatState('closed')}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    title="Close chat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400">
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
                      msg.userId === clerkUser?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 max-w-xs ${
                        msg.userId === clerkUser?.id
                          ? 'bg-red-700/80 text-white'
                          : 'bg-gray-800/60 text-gray-200'
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
                                  {user.role === 'admin' && (
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
                                <div className="flex items-center gap-2">
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
                                  {user.role === 'admin' && (
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
                                  {user.role === 'admin' && (
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
            <div className="p-4 border-t border-gray-800/50 bg-gray-900/40">
              {selectedFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-800/70 rounded px-2 py-1 text-xs">
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
                <div className="mb-2 bg-gray-800/70 rounded px-3 py-2 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-400" />
                  <span className="text-sm flex-1">Voice note ({formatTime(recordingTime)})</span>
                  <button
                    onClick={sendVoiceNote}
                    className="bg-blue-700/80 hover:bg-blue-600 rounded px-3 py-1 text-xs transition-colors"
                    disabled={uploadingFiles}
                  >
                    Send
                  </button>
                  <button
                    onClick={cancelRecording}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isRecording && (
                <div className="mb-2 bg-red-950/40 border border-red-700/50 rounded px-3 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm flex-1">Recording... {formatTime(recordingTime)}</span>
                  <button
                    onClick={stopRecording}
                    className="bg-red-700/80 hover:bg-red-600 rounded-lg p-2 transition-colors"
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
                  className="bg-gray-800/80 hover:bg-gray-700 rounded-lg p-2 transition-colors"
                  disabled={uploadingFiles || isRecording}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${
                    isRecording ? 'bg-red-700/80 hover:bg-red-600' : 'bg-gray-800/80 hover:bg-gray-700'
                  } rounded-lg p-2 transition-colors`}
                  disabled={uploadingFiles || audioBlob !== null}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  ref={messageInputRef}
                  name="message"
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-blue-600/50 focus:bg-gray-800 outline-none transition-colors"
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
                  className="bg-blue-700/80 hover:bg-blue-600 rounded-lg p-2 disabled:opacity-50 transition-colors"
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
          <div className="w-full h-full bg-gray-900 flex flex-col">
            <div className="p-4 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/60">
              <h3 className="font-bold">
                {getProjectForChat()?.title}
              </h3>
              <div className="flex items-center gap-1">
                {user.role === 'admin' && (
                  <button
                    onClick={deleteEntireChat}
                    className="p-2 hover:bg-red-900/40 rounded-lg text-red-300 transition-colors"
                    title="Delete entire chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setChatState('sidebar')}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setChatState('closed')}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto flex flex-col bg-gray-950/50">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.userId === clerkUser?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 max-w-md ${
                        msg.userId === clerkUser?.id
                          ? 'bg-red-700/80 text-white'
                          : 'bg-gray-800/70 text-gray-200'
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
                                  {user.role === 'admin' && (
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
                                <div className="flex items-center gap-2">
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
                                  {user.role === 'admin' && (
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
                                  {user.role === 'admin' && (
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
            <div className="p-4 border-t border-gray-800/50 bg-gray-900/40">
              {selectedFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-800/70 rounded px-2 py-1 text-xs">
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
                <div className="mb-2 bg-gray-800/70 rounded px-3 py-2 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-400" />
                  <span className="text-sm flex-1">Voice note ({formatTime(recordingTime)})</span>
                  <button
                    onClick={sendVoiceNote}
                    className="bg-blue-700/80 hover:bg-blue-600 rounded px-3 py-1 text-xs transition-colors"
                    disabled={uploadingFiles}
                  >
                    Send
                  </button>
                  <button
                    onClick={cancelRecording}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isRecording && (
                <div className="mb-2 bg-red-950/40 border border-red-700/50 rounded px-3 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm flex-1">Recording... {formatTime(recordingTime)}</span>
                  <button
                    onClick={stopRecording}
                    className="bg-red-700/80 hover:bg-red-600 rounded-lg p-2 transition-colors"
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
                  className="bg-gray-800/80 hover:bg-gray-700 rounded-lg p-2 transition-colors"
                  disabled={uploadingFiles || isRecording}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${
                    isRecording ? 'bg-red-700/80 hover:bg-red-600' : 'bg-gray-800/80 hover:bg-gray-700'
                  } rounded-lg p-2 transition-colors`}
                  disabled={uploadingFiles || audioBlob !== null}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  ref={messageInputRef}
                  name="message"
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-blue-600/50 focus:bg-gray-800 outline-none transition-colors"
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
                  className="bg-blue-700/80 hover:bg-blue-600 rounded-lg p-2 disabled:opacity-50 transition-colors"
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
            <div className="p-4 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/40">
              <div>
                <h2 className="text-xl font-bold mb-1 text-gray-100">{companyName}</h2>
                <p className="text-sm text-gray-400">
                  Welcome, {userName}!
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-800/60 rounded-full transition-colors">
                    <UserCircle className="w-6 h-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <SignOutButton>
                    <DropdownMenuItem className="text-red-400 hover:!text-red-400 hover:!bg-red-900/20 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </SignOutButton>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Upcoming Meeting for Users */}
            {upcomingMeeting && (
              <div className="p-4 border-b border-gray-800/50">
                <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Video className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1">{upcomingMeeting.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-300 mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(upcomingMeeting.scheduledAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                        <span>({upcomingMeeting.duration} min)</span>
                      </div>
                      <a
                        href={`/meetings/${upcomingMeeting.id}/join`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-red-700/80 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded transition-colors"
                      >
                        <Video className="w-3 h-3" />
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Meetings Button */}
            <div className="p-4 border-b border-gray-800/50">
              <button
                onClick={() => setShowMeetingsModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-700/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Video className="w-4 h-4" />
                My Meetings
              </button>
            </div>


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
                        ? 'bg-red-700/80 text-white'
                        : 'bg-gray-900/80 hover:bg-gray-800/80 text-gray-200'
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
                      className="absolute top-2 right-2 p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
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
        <div className="bg-gray-900/80 border-b border-gray-800/50 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-800/60 rounded-lg transition-colors"
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
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
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
            <div className="w-full h-full bg-gray-900 flex flex-col">
              <div className="p-4 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/60">
                <h3 className="font-bold">
                  {getProjectForChat()?.title}
                </h3>
                <div className="flex items-center gap-1">
                  {user.role === 'admin' && (
                    <button
                      onClick={deleteEntireChat}
                      className="p-2 hover:bg-red-900/40 rounded-lg text-red-300 transition-colors"
                      title="Delete entire chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setChatState('sidebar')}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setChatState('closed')}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto flex flex-col bg-gray-950/50">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.userId === clerkUser?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-3 py-2 max-w-md ${
                          msg.userId === clerkUser?.id
                            ? 'bg-blue-700/80 text-white'
                            : 'bg-gray-800/70 text-gray-200'
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
                                    {user.role === 'admin' && (
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
                                    {user.role === 'admin' && (
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
                                    {user.role === 'admin' && (
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
              <div className="p-4 border-t border-gray-800/50 bg-gray-900/40">
                {selectedFiles.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-800/70 rounded px-2 py-1 text-xs">
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
            <div className="relative w-full h-full">
              {isProjectLoading && (
                <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-700/30 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Loading {selectedProject.title}...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title={selectedProject.title}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-downloads allow-modals allow-pointer-lock allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; clipboard-read; encrypted-media; gyroscope; picture-in-picture; fullscreen; microphone; camera; geolocation; payment; storage-access-by-user-activation"
                onLoad={() => {
                  console.log('✅ Iframe loaded successfully');
                  setIsProjectLoading(false);
                }}
                onError={(e) => {
                  console.error('❌ Iframe error:', e);
                  setIsProjectLoading(false);
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-950 text-white">
              <p className="text-gray-400">Select a project from the sidebar</p>
            </div>
          )}
        </div>
      </div>

      {/* Meetings Modal */}
      <MeetingsModal
        isOpen={showMeetingsModal}
        onClose={() => setShowMeetingsModal(false)}
        isAdmin={isAdmin}
        userName={userName}
        userId={clerkUser?.id || ''}
        // TODO: usersWithProjects is not defined. This needs to be passed from the server component.
        users={[]}
      />
    </div>
  );
}
