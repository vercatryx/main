"use client";

import { useState, useEffect } from "react";
import { Meeting } from "@/lib/meetings";
import { SerializableUser } from "@/app/admin/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Calendar, Clock, Users, Video, Plus, Trash2, Edit2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface MeetingsManagementProps {
  users: SerializableUser[];
}

export default function MeetingsManagement({ users }: MeetingsManagementProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    duration: "60",
    participantUserIds: [] as string[],
  });

  // Fetch meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meetings');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
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
        await fetchMeetings();
        closeModal();
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
        await fetchMeetings();
      } else {
        alert('Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting');
    }
  };

  const openCreateModal = () => {
    setEditingMeeting(null);
    setFormData({
      title: "",
      description: "",
      scheduledAt: "",
      duration: "60",
      participantUserIds: [],
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingMeeting(null);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return 'Unknown User';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown';
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-400">Loading meetings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Meetings Management</h2>
          <p className="text-gray-400 text-sm mt-1">Create and manage meetings with users</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Create Meeting
        </Button>
      </div>

      {meetings.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-300">No meetings</h3>
              <p className="mt-2 text-gray-400">
                Create your first meeting to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{meeting.title}</CardTitle>
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
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{meeting.participantUserIds.length + 1} participants</span>
                </div>
                <div className="text-xs text-gray-400">
                  Host: {getUserName(meeting.hostUserId)}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    className="flex-1"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Meeting Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Meeting</DialogTitle>
            <DialogDescription className="text-gray-400">
              Schedule a meeting with one or more users
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMeeting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Team Sync"
                required
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Discuss project progress and next steps"
                rows={3}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData({ ...formData, duration: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
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
              <Label>Participants ({formData.participantUserIds.length} selected)</Label>
              <div className="border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 bg-gray-800">
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
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={formData.participantUserIds.length === 0}>
                Create Meeting
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
