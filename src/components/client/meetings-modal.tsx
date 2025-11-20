"use client";

import { useState, useEffect } from "react";
import { Meeting } from "@/lib/meetings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Video, Plus, Trash2, X, Link2, Copy } from "lucide-react";
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

interface Company {
  id: string;
  name: string;
}

interface MeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  userName: string;
  userId: string;
  users?: SerializableUser[];
  companies?: Company[];
}

export default function MeetingsModal({ isOpen, onClose, isAdmin, userName, userId, users: propUsers, companies: propCompanies }: MeetingsModalProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<SerializableUser[]>(propUsers || []);
  const [companies, setCompanies] = useState<Company[]>(propCompanies || []);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating meetings
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    duration: "60",
    accessType: "users" as "users" | "company" | "public",
    participantUserIds: [] as string[],
    participantCompanyIds: [] as string[],
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

  const fetchUsersAndCompanies = async () => {
    try {
      // Fetch Clerk users if admin
      if (isAdmin) {
        const usersResponse = await fetch('/api/clerk/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        } else {
          console.error('Failed to fetch users:', await usersResponse.text());
        }

        // Fetch companies
        const companiesResponse = await fetch('/api/companies');
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          // API returns array directly, not wrapped in { companies: [] }
          setCompanies(Array.isArray(companiesData) ? companiesData : []);
        } else {
          console.error('Failed to fetch companies:', await companiesResponse.text());
        }
      }
    } catch (error) {
      console.error('Error fetching users/companies:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshMeetings();
      fetchUsersAndCompanies();
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
      scheduled: { className: "bg-blue-500/60/60 text-blue-400", label: "Scheduled" },
      "in-progress": { className: "bg-green-900/60 text-green-300", label: "In Progress" },
      completed: { className: "bg-gray-700/60 text-gray-300", label: "Completed" },
      cancelled: { className: "bg-red-500/60/60 text-red-400", label: "Cancelled" },
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
        const data = await response.json();
        await refreshMeetings();
        closeCreateModal();

        // Show meeting link for public meetings
        if (formData.accessType === 'public') {
          const meetingUrl = `${window.location.origin}/meetings/${data.meeting.id}/join`;
          const message = `Meeting created successfully!\n\nMeeting Link:\n${meetingUrl}\n\nShare this link with anyone you want to invite.`;

          // Show alert with link
          if (confirm(message + '\n\nClick OK to copy the link to clipboard.')) {
            navigator.clipboard.writeText(meetingUrl);
          }
        }
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
      accessType: "users",
      participantUserIds: [],
      participantCompanyIds: [],
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
      accessType: "users",
      participantUserIds: [],
      participantCompanyIds: [],
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

  const toggleCompany = (companyId: string) => {
    setFormData((prev) => ({
      ...prev,
      participantCompanyIds: prev.participantCompanyIds.includes(companyId)
        ? prev.participantCompanyIds.filter((id) => id !== companyId)
        : [...prev.participantCompanyIds, companyId],
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
        <DialogContent className="bg-background border-border/50 text-foreground max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl text-foreground">
                  {isAdmin ? 'Manage Meetings' : 'My Meetings'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">
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
                  <div className="w-12 h-12 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading meetings...</p>
                </div>
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-foreground">No upcoming meetings</h3>
                <p className="mt-2 text-muted-foreground">
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
                  <Card key={meeting.id} className="bg-card/80 border-border/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-foreground">{meeting.title}</CardTitle>
                        {getStatusBadge(meeting.status)}
                      </div>
                      {meeting.description && (
                        <CardDescription className="text-muted-foreground text-sm">
                          {meeting.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(meeting.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatTime(meeting.scheduledAt)} ({meeting.duration} min)
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          {meeting.accessType === 'public' ? (
                            <Badge className="bg-green-900/60 text-green-300">Public - Anyone with link</Badge>
                          ) : meeting.accessType === 'company' ? (
                            <Badge className="bg-purple-900/60 text-purple-300">Company-wide</Badge>
                          ) : getParticipantNames(meeting).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {getParticipantNames(meeting).map((name, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span>{meeting.participantUserIds.length + 1} participants</span>
                          )}
                        </div>
                      </div>
                      {meeting.accessType === 'public' && (
                        <div className="flex items-center gap-2 text-sm">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-brand-blue hover:text-brand-blue-hover hover:bg-transparent"
                            onClick={() => {
                              const url = `${window.location.origin}/meetings/${meeting.id}/join`;
                              navigator.clipboard.writeText(url);
                              alert('Meeting link copied to clipboard!');
                            }}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy Meeting Link
                          </Button>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className={isAdmin ? "flex gap-2" : ""}>
                      {canJoinMeeting(meeting) ? (
                        <a
                          href={`/meetings/${meeting.id}/join`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={isAdmin ? "flex-1" : "w-full"}
                        >
                          <Button className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white" size="sm">
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
                          className="bg-red-500/80 hover:bg-red-500"
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
          <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Meeting</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Schedule a meeting with one or more users
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">Meeting Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Team Sync"
                  required
                  className="bg-secondary/50 border-border/50 focus:border-brand-blue/50 text-foreground placeholder-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Discuss project progress and next steps"
                  rows={3}
                  className="bg-secondary/50 border-border/50 focus:border-brand-blue/50 text-foreground placeholder-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt" className="text-foreground">Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    required
                    className="bg-secondary/50 border-border/50 focus:border-brand-blue/50 text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-foreground">Duration (minutes)</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
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
                <Label className="text-foreground">Access Type</Label>
                <Select
                  value={formData.accessType}
                  onValueChange={(value: "users" | "company" | "public") => setFormData({ ...formData, accessType: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="users">Specific Users</SelectItem>
                    <SelectItem value="company">Entire Company</SelectItem>
                    <SelectItem value="public">Public (Anyone with link)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.accessType === 'users' && users && (
                <div className="space-y-2">
                  <Label className="text-foreground">Select Users ({formData.participantUserIds.length} selected)</Label>
                  <div className="border border-border/50 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 bg-secondary/30">
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
              )}

              {formData.accessType === 'company' && companies && (
                <div className="space-y-2">
                  <Label className="text-foreground">Select Companies ({formData.participantCompanyIds.length} selected)</Label>
                  <div className="border border-border/50 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 bg-secondary/30">
                    {companies.map((company) => (
                      <div key={company.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`company-${company.id}`}
                          checked={formData.participantCompanyIds.includes(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                        />
                        <label
                          htmlFor={`company-${company.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {company.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.accessType === 'public' && (
                <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4">
                  <p className="text-sm text-brand-blue">
                    <strong>Public Meeting:</strong> Anyone with the meeting link will be able to join. The link will be provided after creation.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreateModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    (formData.accessType === 'users' && formData.participantUserIds.length === 0) ||
                    (formData.accessType === 'company' && formData.participantCompanyIds.length === 0)
                  }
                  className="bg-brand-blue hover:bg-brand-blue-hover text-white"
                >
                  Create Meeting
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog >
      )
      }
    </>
  );
}
