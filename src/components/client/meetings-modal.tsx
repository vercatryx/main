"use client";

import { useState, useEffect } from "react";
import { Meeting } from "@/lib/meetings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Video, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface SerializableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: any;
}

interface MeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  userName: string;
  userId: string;
  users?: SerializableUser[];
}

export default function MeetingsModal({ isOpen, onClose, isAdmin, userName, userId, users }: MeetingsModalProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating meetings
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    duration: "60",
    participantUserIds: [] as string[],
  });

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
    if (isOpen) {
      refreshMeetings();
    }
  }, [isOpen]);

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
    const variants: Record<Meeting['status'], { className: string; label: string }> = {
      scheduled: { className: "bg-blue-900/60 text-blue-300", label: "Scheduled" },
      "in-progress": { className: "bg-green-900/60 text-green-300", label: "In Progress" },
      completed: { className: "bg-gray-700/60 text-gray-300", label: "Completed" },
      cancelled: { className: "bg-red-900/60 text-red-300", label: "Cancelled" },
    };

    const { className, label } = variants[status];
    return <Badge className={className}>{label}</Badge>;
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

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert datetime-local to ISO string with proper timezone
      const scheduledAtISO = new Date(formData.scheduledAt).toISOString();

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduledAt: scheduledAtISO,
          duration: parseInt(formData.duration),
        }),
      });

      if (response.ok) {
        await refreshMeetings();
        closeCreateModal();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Failed to create meeting');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refreshMeetings();
      } else {
        alert('Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting');
    }
  };

  const openCreateModal = () => {
    setFormData({
      title: "",
      description: "",
      scheduledAt: "",
      duration: "60",
      participantUserIds: [],
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      title: "",
      description: "",
      scheduledAt: "",
      duration: "60",
      participantUserIds: [],
    });
  };

  const toggleParticipant = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      participantUserIds: prev.participantUserIds.includes(userId)
        ? prev.participantUserIds.filter((id) => id !== userId)
        : [...prev.participantUserIds, userId],
    }));
  };

  const getParticipantNames = (meeting: Meeting) => {
    if (!users) return [];

    // Get all participant IDs including the host
    const allParticipantIds = [meeting.hostUserId, ...meeting.participantUserIds];

    return allParticipantIds
      .map(id => {
        const user = users.find(u => u.id === id);
        if (user) {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          return fullName || user.emailAddresses[0]?.emailAddress || 'Unknown';
        }
        // Check if it's the current user
        if (id === userId) {
          return userName;
        }
        return null;
      })
      .filter(Boolean) as string[];
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900/95 border-gray-800/50 text-white max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl text-gray-100">
                  {isAdmin ? 'Manage Meetings' : 'My Meetings'}
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  Welcome back, {userName}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button onClick={openCreateModal} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Meeting
                  </Button>
                )}
                <Button onClick={refreshMeetings} disabled={loading} variant="outline" size="sm">
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-blue-700/30 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Loading meetings...</p>
                </div>
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-300">No upcoming meetings</h3>
                <p className="mt-2 text-gray-400">
                  You don't have any meetings scheduled at the moment.
                </p>
                {isAdmin && (
                  <Button onClick={openCreateModal} className="mt-4" size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Meeting
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {meetings.map((meeting) => (
                  <Card key={meeting.id} className="bg-gray-900/80 border-gray-800/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-gray-100">{meeting.title}</CardTitle>
                        {getStatusBadge(meeting.status)}
                      </div>
                      {meeting.description && (
                        <CardDescription className="text-gray-400 text-sm">
                          {meeting.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
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
                      <div className="flex items-start gap-2 text-sm text-gray-300">
                        <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          {getParticipantNames(meeting).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {getParticipantNames(meeting).map((name, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-800/60 text-gray-300">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span>{meeting.participantUserIds.length + 1} participants</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className={isAdmin ? "flex gap-2" : ""}>
                      {canJoinMeeting(meeting) ? (
                        <a
                          href={`/meetings/${meeting.id}/join`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={isAdmin ? "flex-1" : "w-full"}
                        >
                          <Button className="w-full bg-blue-700/80 hover:bg-blue-600" size="sm">
                            <Video className="mr-2 h-4 w-4" />
                            Join Meeting
                          </Button>
                        </a>
                      ) : (
                        <Button className={isAdmin ? "flex-1" : "w-full"} disabled size="sm">
                          Not Yet Available
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="bg-red-700/80 hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Meeting Dialog */}
      {isAdmin && users && (
        <Dialog open={showCreateModal} onOpenChange={closeCreateModal}>
          <DialogContent className="bg-gray-900/95 border-gray-800/50 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Create New Meeting</DialogTitle>
              <DialogDescription className="text-gray-400">
                Schedule a meeting with one or more users
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-200">Meeting Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Team Sync"
                  required
                  className="bg-gray-800/80 border-gray-700/50 focus:border-blue-600/50 text-gray-100 placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-200">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Discuss project progress and next steps"
                  rows={3}
                  className="bg-gray-800/80 border-gray-700/50 focus:border-blue-600/50 text-gray-100 placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt" className="text-gray-200">Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    required
                    className="bg-gray-800/80 border-gray-700/50 focus:border-blue-600/50 text-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-gray-200">Duration (minutes)</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger className="bg-gray-800/80 border-gray-700/50 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800/90 border-gray-700/50 text-white">
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-200">Participants ({formData.participantUserIds.length} selected)</Label>
                <div className="border border-gray-700/50 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 bg-gray-800/70">
                  {users.filter(u => (u.publicMetadata as any)?.role !== 'superuser').map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={formData.participantUserIds.includes(user.id)}
                        onCheckedChange={() => toggleParticipant(user.id)}
                      />
                      <label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {user.firstName} {user.lastName} ({user.emailAddresses[0]?.emailAddress})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreateModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formData.participantUserIds.length === 0} className="bg-blue-700/80 hover:bg-blue-600">
                  Create Meeting
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
