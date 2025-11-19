"use client";

import { useEffect, useRef, useState } from "react";
import { Meeting } from "@/lib/meetings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, UserPlus, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
  const router = useRouter();

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
            hideConferenceSubject: false,
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
        });

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
    };
  }, [meeting.id, meeting.jitsiRoomName, displayName, router, jwtToken]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-red-500">Error</h1>
          <p className="text-gray-400">{error}</p>
          <Button onClick={() => router.push('/meetings')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-gray-950 flex flex-col">
      {/* Header with Logo and Controls */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between z-20">
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
            <h1 className="text-white font-semibold text-lg">{meeting.title}</h1>
            <p className="text-gray-400 text-sm">
              {new Date(meeting.scheduledAt).toLocaleDateString()} at {new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Meeting Controls */}
        <div className="flex items-center gap-2">
          {isSuperuser && (
            <Button
              onClick={handleOpenInviteModal}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
          )}
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
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
      <div className="relative flex-1 bg-black border-x border-b border-gray-700">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="text-white text-lg">Joining {meeting.title}...</p>
            </div>
          </div>
        )}

        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>

      {/* Invite Modal */}
      {showInviteModal && isSuperuser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Invite Participants</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white"
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setInviteType('companies')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    inviteType === 'companies'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
                      className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer"
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
                      <span className="text-white">
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
                      className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer"
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
                      <span className="text-white">{company.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="outline"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviting || (inviteType === 'users' && selectedUsers.length === 0) || (inviteType === 'companies' && selectedCompanies.length === 0)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
