"use client";

import { useEffect, useRef, useState } from "react";
import { Meeting } from "@/lib/meetings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface JitsiMeetClientProps {
  meeting: Meeting;
  userId: string;
  displayName: string;
}

// Extend the Window interface to include JitsiMeetExternalAPI
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function JitsiMeetClient({ meeting, userId, displayName }: JitsiMeetClientProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
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
    <div className="relative h-screen w-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white text-lg">Joining {meeting.title}...</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-20">
        <Button onClick={handleLeave} variant="destructive">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Leave Meeting
        </Button>
      </div>

      <div ref={jitsiContainerRef} className="w-full h-full" />
    </div>
  );
}
