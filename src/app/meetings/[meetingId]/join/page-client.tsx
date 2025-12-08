"use client";

import { useEffect, useRef, useState } from "react";
import { Meeting, MeetingDocument } from "@/lib/meetings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, UserPlus, Check, MousePointer2, Paperclip, X, Download, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AnimatedLogo from "@/components/AnimatedLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JitsiMeetClientProps {
  meeting: Meeting;
  userId: string;
  displayName: string;
  isSuperuser: boolean;
}

// Extend the Window interface to include JitsiMeetExternalAPI
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function JitsiMeetClient({ meeting, userId, displayName, isSuperuser }: JitsiMeetClientProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteType, setInviteType] = useState<'users' | 'companies'>('users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);
  const [pointerModeEnabled, setPointerModeEnabled] = useState(false);
  const [sharingParticipantId, setSharingParticipantId] = useState<string | null>(null);
  const pointerOverlayRef = useRef<HTMLDivElement | null>(null);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const router = useRouter();
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [documents, setDocuments] = useState<MeetingDocument[]>(meeting.documents || []);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch JWT token first
    const fetchJwtToken = async () => {
      try {
        const response = await fetch(`/api/meetings/${meeting.id}/token`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get authentication token');
        }
        const data = await response.json();
        setJwtToken(data.token);
      } catch (err) {
        console.error('Error fetching JWT token:', err);
        setError(err instanceof Error ? err.message : 'Failed to authenticate. Please try again.');
        setIsLoading(false);
      }
    };

    fetchJwtToken();
  }, [meeting.id]);

  useEffect(() => {
    if (!jwtToken) return;

    // Update meeting status to in-progress when someone joins
    const updateMeetingStatus = async () => {
      try {
        await fetch(`/api/meetings/${meeting.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in-progress' }),
        });
      } catch (error) {
        console.error('Error updating meeting status:', error);
      }
    };

    updateMeetingStatus();

    // Load Jitsi Meet External API script
    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi Meet API'));
        document.body.appendChild(script);
      });
    };

    // Initialize Jitsi Meet
    const initJitsi = async () => {
      try {
        await loadJitsiScript();

        if (!jitsiContainerRef.current) {
          throw new Error('Container not found');
        }

        const domain = '8x8.vc';
        const options = {
          roomName: `${process.env.NEXT_PUBLIC_JAAS_APP_ID || 'vpaas-magic-cookie'}/${meeting.jitsiRoomName}`,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          jwt: jwtToken,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            prejoinConfig: {
              enabled: false,
            },
            disableDeepLinking: true,
            // Hide Jitsi's default conference subject/timer header
            hideConferenceSubject: true,
            hideConferenceTimer: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'chat',
              'recording',
              'livestreaming',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'stats',
              'shortcuts',
              'tileview',
              'download',
              'help',
              'mute-everyone',
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
          userInfo: {
            displayName: displayName,
          },
        };

        // Create Jitsi instance with JaaS
        jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);

        console.log('Jitsi Meet initialized with JaaS for room:', meeting.jitsiRoomName);

        jitsiApiRef.current.addEventListener('readyToClose', () => {
          router.push('/meetings');
        });

        jitsiApiRef.current.addEventListener('videoConferenceJoined', () => {
          setIsLoading(false);
        });

        jitsiApiRef.current.addEventListener('participantLeft', async (event: any) => {
          // Check if all participants have left
          const participants = await jitsiApiRef.current.getNumberOfParticipants();
          if (participants === 0) {
            // Update meeting status to completed
            try {
              await fetch(`/api/meetings/${meeting.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
              });
            } catch (error) {
              console.error('Error updating meeting status:', error);
            }
          }
          
          // If the sharing participant left, clear the sharing state
          if (event.id === sharingParticipantId) {
            setSharingParticipantId(null);
            if (pointerModeEnabled) {
              setPointerModeEnabled(false);
            }
          }
        });

        // Listen for screen sharing events
        jitsiApiRef.current.addEventListener('participantVideoTypeChanged', async (event: any) => {
          const participantId = event.id;
          const videoType = event.videoType;
          
          console.log('Participant video type changed:', { participantId, videoType, isSuperuser, pointerModeEnabled });
          
          // Check if this participant is sharing their screen (desktop track)
          if (videoType === 'desktop') {
            console.log('Desktop sharing detected for participant:', participantId);
            // If we're a superuser and pointer mode is enabled, track this participant
            if (isSuperuser && pointerModeEnabled) {
              console.log('Setting sharing participant ID for superuser:', participantId);
              setSharingParticipantId(participantId);
            } else if (!isSuperuser) {
              // If we're not a superuser and someone is sharing, we might receive pointer messages
              console.log('Non-superuser detected screen sharing');
              setSharingParticipantId(participantId);
            }
          } else if (videoType === 'camera' && participantId === sharingParticipantId) {
            // Participant stopped sharing
            console.log('Participant stopped sharing');
            setSharingParticipantId(null);
            if (isSuperuser && pointerModeEnabled) {
              setPointerModeEnabled(false);
            }
          }
        });
        
        // Also listen for when participants join to detect screen sharing
        jitsiApiRef.current.addEventListener('participantJoined', async (event: any) => {
          console.log('Participant joined:', event);
        });

        // Listen for pointer messages (for non-superusers receiving pointer)
        if (!isSuperuser) {
          jitsiApiRef.current.addEventListener('endpointTextMessageReceived', (event: any) => {
            console.log('Non-superuser received endpoint message:', event);
            try {
              const message = JSON.parse(event.text);
              console.log('Parsed message:', message);
              if (message.type === 'remote-pointer') {
                console.log('Displaying pointer at:', message.x, message.y);
                // Display the pointer overlay - we assume if we receive this message,
                // a superuser is pointing on our shared screen
                displayPointerOverlay(message.x, message.y);
              }
            } catch (error) {
              // Not a JSON message, ignore
              console.log('Message is not JSON, ignoring:', error);
            }
          });
        }

      } catch (err) {
        console.error('Error initializing Jitsi:', err);
        setError('Failed to load video conference. Please try again.');
        setIsLoading(false);
      }
    };

    initJitsi();

    // Cleanup function
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
      // Clean up pointer overlay
      if (pointerOverlayRef.current) {
        pointerOverlayRef.current.remove();
        pointerOverlayRef.current = null;
      }
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
    };
  }, [meeting.id, meeting.jitsiRoomName, displayName, router, jwtToken, isSuperuser]);

  const handleLeave = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('hangup');
    }
    router.push('/meetings');
  };

  const handleCopyLink = () => {
    const meetingUrl = `${window.location.origin}/meetings/${meeting.id}/join`;
    navigator.clipboard.writeText(meetingUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const refreshDocuments = async () => {
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.meeting?.documents) {
          setDocuments(data.meeting.documents);
        }
      }
    } catch (error) {
      console.error('Error refreshing documents:', error);
    }
  };

  const handleOpenDocumentsModal = () => {
    setShowDocumentsModal(true);
    refreshDocuments();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/meetings/${meeting.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const newDocument = await response.json();
      setDocuments(prev => [...prev, newDocument]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setDeletingDocId(documentId);
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleOpenInviteModal = async () => {
    if (!isSuperuser) return;

    setShowInviteModal(true);

    // Fetch users and companies
    try {
      const [usersRes, companiesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/companies')
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
      }

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(Array.isArray(companiesData) ? companiesData : companiesData.companies || []);
      }
    } catch (error) {
      console.error('Error fetching users/companies:', error);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantUserIds: inviteType === 'users' ? [...meeting.participantUserIds, ...selectedUsers] : meeting.participantUserIds,
          participantCompanyIds: inviteType === 'companies' ? [...meeting.participantCompanyIds, ...selectedCompanies] : meeting.participantCompanyIds,
        }),
      });

      if (response.ok) {
        alert('Participants added successfully!');
        setShowInviteModal(false);
        setSelectedUsers([]);
        setSelectedCompanies([]);
      } else {
        alert('Failed to add participants');
      }
    } catch (error) {
      console.error('Error inviting participants:', error);
      alert('Failed to add participants');
    } finally {
      setInviting(false);
    }
  };

  // Display pointer overlay (for non-superusers)
  const displayPointerOverlay = (x: number, y: number) => {
    const jitsiContainer = jitsiContainerRef.current;
    if (!jitsiContainer) {
      console.log('Pointer overlay: No Jitsi container found');
      return;
    }

    if (!pointerOverlayRef.current) {
      // Create pointer overlay element - use fixed positioning to sit on top of iframe
      const overlay = document.createElement('div');
      overlay.id = 'remote-pointer-overlay';
      overlay.style.cssText = `
        position: fixed;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        pointer-events: none;
        z-index: 999999;
        display: block;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.7), 0 0 0 2px rgba(59, 130, 246, 0.3);
        transition: left 0.05s ease-out, top 0.05s ease-out;
      `;
      
      // Append to body so it's on top of everything
      document.body.appendChild(overlay);
      pointerOverlayRef.current = overlay;
      console.log('Pointer overlay created');
    }

    if (pointerOverlayRef.current && jitsiContainer) {
      // Try to find the iframe and calculate position relative to it
      const iframe = jitsiContainer.querySelector('iframe');
      let targetRect: DOMRect;
      
      if (iframe) {
        // Use iframe position - the shared screen video is typically in the main area
        targetRect = iframe.getBoundingClientRect();
      } else {
        // Fallback to container
        targetRect = jitsiContainer.getBoundingClientRect();
      }
      
      // Calculate position - x and y are percentages (0-100) of the shared screen
      const left = targetRect.left + (targetRect.width * x / 100);
      const top = targetRect.top + (targetRect.height * y / 100);
      
      pointerOverlayRef.current.style.left = `${left}px`;
      pointerOverlayRef.current.style.top = `${top}px`;
      pointerOverlayRef.current.style.display = 'block';
      
      console.log('Pointer overlay positioned at:', { x, y, left, top, containerWidth: targetRect.width, containerHeight: targetRect.height });
      
      // Hide after 3 seconds of no movement (will be updated on next movement)
      clearTimeout((pointerOverlayRef.current as any).hideTimeout);
      (pointerOverlayRef.current as any).hideTimeout = setTimeout(() => {
        if (pointerOverlayRef.current) {
          pointerOverlayRef.current.style.display = 'none';
        }
      }, 3000);
    }
  };

  // Toggle pointer mode (superuser only)
  const handleTogglePointerMode = async () => {
    if (!isSuperuser || !jitsiApiRef.current) return;

    const newPointerMode = !pointerModeEnabled;
    setPointerModeEnabled(newPointerMode);
    console.log('Pointer mode toggled:', newPointerMode);

    if (newPointerMode) {
      // Find who is sharing their screen
      try {
        const participants = await jitsiApiRef.current.getParticipantsInfo();
        console.log('All participants:', participants);
        let foundSharing = false;
        for (const participant of participants) {
          console.log('Checking participant:', participant);
          if (participant.videoType === 'desktop') {
            console.log('Found sharing participant:', participant.participantId);
            setSharingParticipantId(participant.participantId);
            foundSharing = true;
            break;
          }
        }
        if (!foundSharing) {
          console.log('No one is sharing yet, pointer mode will activate when someone shares');
          // No one is sharing yet, but enable pointer mode so it activates when someone shares
          // The participantVideoTypeChanged event will set the sharingParticipantId
        }
      } catch (error) {
        console.error('Error getting participants:', error);
      }
    } else {
      // Clean up mouse tracking
      const container = jitsiContainerRef.current;
      if (container && mouseMoveHandlerRef.current) {
        container.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
      setSharingParticipantId(null);
    }
  };

  // Track mouse position on shared screen and send pointer coordinates
  useEffect(() => {
    if (!isSuperuser || !pointerModeEnabled || !sharingParticipantId || !jitsiApiRef.current) {
      // Clean up if conditions not met
      if (mouseMoveHandlerRef.current) {
        const container = jitsiContainerRef.current;
        if (container && mouseMoveHandlerRef.current) {
          container.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        }
        mouseMoveHandlerRef.current = null;
      }
      return;
    }

    const container = jitsiContainerRef.current;
    if (!container) return;

    // Track mouse on the entire Jitsi container
    // Since the shared screen typically takes up the main area, we'll use the container dimensions
      const handleMouseMove = (e: MouseEvent) => {
        // Try to find the iframe to get more accurate positioning
        const iframe = container.querySelector('iframe');
        let targetRect: DOMRect;
        
        if (iframe) {
          targetRect = iframe.getBoundingClientRect();
        } else {
          targetRect = container.getBoundingClientRect();
        }
        
        // Calculate position relative to the target (iframe or container)
        // This should match where the shared screen video is displayed
        const x = ((e.clientX - targetRect.left) / targetRect.width) * 100;
        const y = ((e.clientY - targetRect.top) / targetRect.height) * 100;

        // Only send if mouse is over the target area
        if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
          try {
            const message = {
              type: 'remote-pointer',
              x,
              y,
              timestamp: Date.now()
            };
            console.log('Superuser sending pointer message to', sharingParticipantId, ':', message);
            
            // Try sendEndpointMessage - this sends to a specific participant
            if (jitsiApiRef.current && sharingParticipantId) {
              jitsiApiRef.current.sendEndpointMessage(sharingParticipantId, JSON.stringify(message));
            }
          } catch (error) {
            console.error('Error sending pointer message:', error);
          }
        }
      };

    container.addEventListener('mousemove', handleMouseMove);
    mouseMoveHandlerRef.current = handleMouseMove;

    return () => {
      if (container && mouseMoveHandlerRef.current) {
        container.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
    };
  }, [isSuperuser, pointerModeEnabled, sharingParticipantId]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-red-500">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/meetings')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-background flex flex-col">
      {/* Header with Logo and Controls */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between z-20">
        {/* Logo and Meeting Title */}
        <div className="flex items-center gap-4">
          <Image
            src="/logo-small-white.svg"
            alt="Vercatryx"
            width={40}
            height={40}
            className="flex-shrink-0"
          />
          <div>
            <h1 className="text-foreground font-semibold text-lg">{meeting.title}</h1>
            <p className="text-muted-foreground text-sm">
              {new Date(meeting.scheduledAt).toLocaleDateString()} at {new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Meeting Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenDocumentsModal}
            variant="outline"
            size="sm"
            className="bg-secondary border-border text-foreground hover:bg-secondary"
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Documents {documents.length > 0 && `(${documents.length})`}
          </Button>
          {isSuperuser && (
            <>
              <Button
                onClick={handleTogglePointerMode}
                variant={pointerModeEnabled ? "default" : "outline"}
                size="sm"
                className={pointerModeEnabled 
                  ? "bg-blue-500 hover:bg-blue-600 text-white" 
                  : "bg-secondary border-border text-foreground hover:bg-secondary"
                }
                title={pointerModeEnabled 
                  ? "Click to turn off pointer" 
                  : sharingParticipantId 
                    ? "Click to show your pointer on shared screen" 
                    : "Enable pointer mode (will activate when someone shares their screen)"}
              >
                <MousePointer2 className="mr-2 h-4 w-4" />
                {pointerModeEnabled ? "Pointer On" : "Show Pointer"}
              </Button>
            <Button
              onClick={handleOpenInviteModal}
              variant="outline"
              size="sm"
              className="bg-secondary border-border text-foreground hover:bg-secondary"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
            </>
          )}
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="bg-secondary border-border text-foreground hover:bg-secondary"
          >
            {linkCopied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
          <Button
            onClick={handleLeave}
            variant="destructive"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Leave Meeting
          </Button>
        </div>
      </div>

      {/* Meeting Container */}
      <div className="relative flex-1 bg-background border-x border-b border-border">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <AnimatedLogo
                width="300px"
                height="300px"
                speed={5}
              />
              <p className="text-foreground text-lg mt-6">Joining {meeting.title}...</p>
            </div>
          </div>
        )}

        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>

      {/* Documents Modal */}
      <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting Documents</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Attach and manage documents for this meeting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Section */}
            <div className="border border-border rounded-lg p-4 bg-secondary">
              <label className="block mb-2 text-sm font-medium text-foreground">
                Upload Document
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="document-upload"
                  disabled={uploading}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="bg-secondary border-border text-foreground hover:bg-secondary"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Paperclip className="mr-2 h-4 w-4" />
                      Choose File
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Attached Documents ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No documents attached yet
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {doc.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.url, '_blank')}
                          className="text-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(isSuperuser || doc.uploadedBy === userId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deletingDocId === doc.id}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            {deletingDocId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      {showInviteModal && isSuperuser && (
        <div className="fixed inset-0 bg-background/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Invite Participants</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInviteType('users')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    inviteType === 'users'
                      ? 'bg-blue-500 text-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setInviteType('companies')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    inviteType === 'companies'
                      ? 'bg-blue-500 text-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Companies
                </button>
              </div>

              {inviteType === 'users' ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-secondary rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-foreground">
                        {user.first_name} {user.last_name} ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {companies.map((company) => (
                    <label
                      key={company.id}
                      className="flex items-center gap-2 p-2 hover:bg-secondary rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCompanies([...selectedCompanies, company.id]);
                          } else {
                            setSelectedCompanies(selectedCompanies.filter(id => id !== company.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-foreground">{company.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="outline"
                className="bg-secondary border-border text-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviting || (inviteType === 'users' && selectedUsers.length === 0) || (inviteType === 'companies' && selectedCompanies.length === 0)}
                className="bg-blue-500 hover:bg-blue-500 text-foreground"
              >
                {inviting ? 'Inviting...' : 'Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
