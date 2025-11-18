"use client";

import { useState, useEffect } from "react";
import { Meeting } from "@/lib/meetings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Video } from "lucide-react";
import Link from "next/link";

interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isAdmin: boolean;
}

interface MeetingsClientProps {
  userInfo: UserInfo;
  initialMeetings: Meeting[];
}

export default function MeetingsClient({ userInfo, initialMeetings }: MeetingsClientProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [loading, setLoading] = useState(false);

  const refreshMeetings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meetings/upcoming');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error refreshing meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refresh meetings every 30 seconds
    const interval = setInterval(refreshMeetings, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadge = (status: Meeting['status']) => {
    const variants: Record<Meeting['status'], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      scheduled: { variant: "default", label: "Scheduled" },
      "in-progress": { variant: "secondary", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };

    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const canJoinMeeting = (meeting: Meeting) => {
    const now = new Date();
    const scheduledDate = new Date(meeting.scheduledAt);
    const endTime = new Date(scheduledDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after scheduled time

    // Can join 30 minutes before scheduled time
    const joinableTime = new Date(scheduledDate.getTime() - 30 * 60 * 1000);

    return (
      (meeting.status === 'scheduled' || meeting.status === 'in-progress') &&
      now >= joinableTime &&
      now <= endTime
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">My Meetings</h1>
          <p className="text-gray-400 mt-2">
            Welcome back, {userInfo.firstName || userInfo.email}
          </p>
        </div>
        <div className="flex gap-2">
          {userInfo.isAdmin && (
            <Link href="/admin">
              <Button variant="default">
                <Video className="mr-2 h-4 w-4" />
                Create Meeting
              </Button>
            </Link>
          )}
          <Button onClick={refreshMeetings} disabled={loading} variant="outline">
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-300">No upcoming meetings</h3>
              <p className="mt-2 text-gray-400">
                You don't have any meetings scheduled at the moment.
              </p>
              {userInfo.isAdmin && (
                <Link href="/admin">
                  <Button className="mt-4" size="lg">
                    <Video className="mr-2 h-4 w-4" />
                    Create Your First Meeting
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{meeting.title}</CardTitle>
                  {getStatusBadge(meeting.status)}
                </div>
                {meeting.description && (
                  <CardDescription className="text-gray-400">
                    {meeting.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(meeting.scheduledAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>
                    {formatTime(meeting.scheduledAt)} ({meeting.duration} min)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{meeting.participantUserIds.length + 1} participants</span>
                </div>
              </CardContent>
              <CardFooter>
                {canJoinMeeting(meeting) ? (
                  <Link href={`/meetings/${meeting.id}/join`} className="w-full">
                    <Button className="w-full" size="lg">
                      <Video className="mr-2 h-4 w-4" />
                      Join Meeting
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" disabled size="lg">
                    Not Yet Available
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
