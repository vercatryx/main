"use client";

import { useState, useEffect } from "react";
import { Meeting } from "@/lib/meetings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Video, Plus, Trash2, ChevronDown, Loader2, Pencil } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import Link from "next/link";

interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isAdmin: boolean;
}

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

interface MeetingsClientProps {
  userInfo: UserInfo;
  initialMeetings: Meeting[];
  users?: SerializableUser[];
  companies?: Company[];
}

export default function MeetingsClient({ userInfo, initialMeetings, users, companies }: MeetingsClientProps) {
  const [allMeetings, setAllMeetings] = useState<Meeting[]>(initialMeetings);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companiesList, setCompaniesList] = useState<Company[]>(companies || []);
  const [pastMeetingsOpen, setPastMeetingsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
      // Fetch all meetings (not just upcoming)
      const response = await fetch('/api/meetings');
      if (response.ok) {
        const data = await response.json();
        setAllMeetings(data.meetings || []);
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

  useEffect(() => {
    // Fetch companies if superuser
    if (userInfo.isAdmin) {
      fetch('/api/companies')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCompaniesList(data);
          }
        })
        .catch(err => console.error('Error fetching companies:', err));
    }
  }, [userInfo.isAdmin]);

  const getCompanyNames = (meeting: Meeting) => {
    if (!companiesList || !userInfo.isAdmin) return [];
    return meeting.participantCompanyIds
      .map(id => {
        const company = companiesList.find(c => c.id === id);
        return company?.name || null;
      })
      .filter(Boolean) as string[];
  };

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

    // Can join 2 hours before scheduled time
    const joinableTime = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);

    return (
      (meeting.status === 'scheduled' || meeting.status === 'in-progress') &&
      now >= joinableTime &&
      now <= endTime
    );
  };

  // Separate meetings into upcoming and past
  // Filter out public meetings for non-superusers
  const filteredMeetings = userInfo.isAdmin 
    ? allMeetings 
    : allMeetings.filter(meeting => meeting.accessType !== 'public');

  const now = new Date();
  const upcomingMeetings = filteredMeetings
    .filter((meeting) => {
      const scheduledDate = new Date(meeting.scheduledAt);
      const meetingEndTime = new Date(scheduledDate.getTime() + meeting.duration * 60 * 1000); // scheduledAt + duration
      return now < meetingEndTime; // Meeting hasn't ended yet
    })
    .sort((a, b) => {
      // Sort by scheduled time ascending (closest to now first)
      const dateA = new Date(a.scheduledAt).getTime();
      const dateB = new Date(b.scheduledAt).getTime();
      return dateA - dateB;
    });

  const pastMeetings = filteredMeetings
    .filter((meeting) => {
      const scheduledDate = new Date(meeting.scheduledAt);
      const meetingEndTime = new Date(scheduledDate.getTime() + meeting.duration * 60 * 1000); // scheduledAt + duration
      const joinWindowEnd = new Date(scheduledDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after scheduled time
      // Past if meeting ended but still within 3 hour join window
      return now >= meetingEndTime && now <= joinWindowEnd;
    })
    .sort((a, b) => {
      // Sort past meetings by scheduled time descending (most recent first)
      const dateA = new Date(a.scheduledAt).getTime();
      const dateB = new Date(b.scheduledAt).getTime();
      return dateB - dateA;
    });

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreating) return; // Prevent multiple submissions

    setIsCreating(true);
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
        closeModal();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (deletingMeetingId === meetingId) return; // Already deleting

    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    setDeletingMeetingId(meetingId);
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
    } finally {
      setDeletingMeetingId(null);
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

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingMeeting(null);
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

  const handleEditMeeting = async (meeting: Meeting) => {
    try {
      // Fetch the meeting details
      const response = await fetch(`/api/meetings/${meeting.id}`);
      if (!response.ok) {
        alert('Failed to load meeting details');
        return;
      }
      const data = await response.json();
      const fullMeeting = data.meeting;

      // Convert database UUIDs to Clerk IDs for the form
      const participantClerkIds: string[] = [];
      if (fullMeeting.participantUserIds && fullMeeting.participantUserIds.length > 0) {
        // Fetch users from database to get their Clerk IDs
        for (const dbId of fullMeeting.participantUserIds) {
          try {
            const userResponse = await fetch(`/api/users/${dbId}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              if (userData.clerk_user_id) {
                participantClerkIds.push(userData.clerk_user_id);
              }
            }
          } catch (err) {
            console.error(`Error fetching user ${dbId}:`, err);
          }
        }
      }

      // Format scheduledAt for datetime-local input (remove timezone info)
      const scheduledDate = new Date(fullMeeting.scheduledAt);
      const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        title: fullMeeting.title,
        description: fullMeeting.description || "",
        scheduledAt: localDateTime,
        duration: fullMeeting.duration.toString(),
        accessType: fullMeeting.accessType,
        participantUserIds: participantClerkIds,
        participantCompanyIds: fullMeeting.participantCompanyIds || [],
      });
      setEditingMeeting(fullMeeting);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Error loading meeting:', error);
      alert('Failed to load meeting details');
    }
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || isUpdating) return;

    setIsUpdating(true);
    try {
      const scheduledAtISO = new Date(formData.scheduledAt).toISOString();

      const response = await fetch(`/api/meetings/${editingMeeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledAt: scheduledAtISO,
          duration: parseInt(formData.duration),
          accessType: formData.accessType,
          participantUserIds: formData.participantUserIds,
          participantCompanyIds: formData.participantCompanyIds,
        }),
      });

      if (response.ok) {
        await refreshMeetings();
        closeModal();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update meeting');
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('Failed to update meeting');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      participantUserIds: prev.participantUserIds.includes(userId)
        ? prev.participantUserIds.filter((id) => id !== userId)
        : [...prev.participantUserIds, userId],
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">My Meetings</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {userInfo.firstName || userInfo.email}
          </p>
        </div>
        <div className="flex gap-2">
          {userInfo.isAdmin && (
            <Button onClick={openCreateModal} variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Create Meeting
            </Button>
          )}
          <Button onClick={refreshMeetings} disabled={loading} variant="outline">
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {upcomingMeetings.length === 0 && pastMeetings.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No meetings</h3>
              <p className="mt-2 text-muted-foreground">
                You don't have any meetings scheduled at the moment.
              </p>
              {userInfo.isAdmin && (
                <Button onClick={openCreateModal} className="mt-4" size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Meeting
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcomingMeetings.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Upcoming Meetings</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((meeting) => (
            <Card key={meeting.id} className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{meeting.title}</CardTitle>
                  {getStatusBadge(meeting.status)}
                </div>
                {meeting.description && (
                  <CardDescription className="text-muted-foreground">
                    {meeting.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(meeting.scheduledAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(meeting.scheduledAt)} ({meeting.duration} min)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    {meeting.accessType === 'company' && userInfo.isAdmin && getCompanyNames(meeting).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {getCompanyNames(meeting).map((name, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (meeting as any)._participantNames && (meeting as any)._participantNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(meeting as any)._participantNames.map((name: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span>{meeting.participantUserIds.length + 1} participants</span>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className={userInfo.isAdmin ? "flex gap-2" : ""}>
                {canJoinMeeting(meeting) ? (
                  <Link href={`/meetings/${meeting.id}/join`} className={userInfo.isAdmin ? "flex-1" : "w-full"}>
                    <Button className="w-full" size="lg">
                      <Video className="mr-2 h-4 w-4" />
                      Join Meeting
                    </Button>
                  </Link>
                ) : (
                  <Button className={userInfo.isAdmin ? "flex-1" : "w-full"} disabled size="lg">
                    Not Yet Available
                  </Button>
                )}
                {userInfo.isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleEditMeeting(meeting)}
                      disabled={isUpdating || deletingMeetingId === meeting.id}
                      title="Edit Meeting"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      disabled={deletingMeetingId === meeting.id || isUpdating}
                      title="Delete Meeting"
                    >
                      {deletingMeetingId === meeting.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
                ))}
              </div>
            </div>
          )}

          {pastMeetings.length > 0 && (
            <div className={upcomingMeetings.length > 0 ? "mt-8" : ""}>
              <Collapsible open={pastMeetingsOpen} onOpenChange={setPastMeetingsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">Past Meetings</h2>
                    <Badge variant="outline" className="text-xs">
                      {pastMeetings.length}
                    </Badge>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${pastMeetingsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pastMeetings.map((meeting) => (
                    <Card key={meeting.id} className="bg-card border-border opacity-75">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-xl">{meeting.title}</CardTitle>
                          {getStatusBadge(meeting.status)}
                        </div>
                        {meeting.description && (
                          <CardDescription className="text-muted-foreground">
                            {meeting.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(meeting.scheduledAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formatTime(meeting.scheduledAt)} ({meeting.duration} min)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            {meeting.accessType === 'company' && userInfo.isAdmin && getCompanyNames(meeting).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {getCompanyNames(meeting).map((name, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (meeting as any)._participantNames && (meeting as any)._participantNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(meeting as any)._participantNames.map((name: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span>{meeting.participantUserIds.length + 1} participants</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className={userInfo.isAdmin ? "flex gap-2" : ""}>
                        {canJoinMeeting(meeting) ? (
                          <Link href={`/meetings/${meeting.id}/join`} className={userInfo.isAdmin ? "flex-1" : "w-full"}>
                            <Button className="w-full" size="lg" variant="outline">
                              <Video className="mr-2 h-4 w-4" />
                              Join Meeting
                            </Button>
                          </Link>
                        ) : (
                          <Button className={userInfo.isAdmin ? "flex-1" : "w-full"} disabled size="lg" variant="outline">
                            Meeting Ended
                          </Button>
                        )}
                        {userInfo.isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => handleEditMeeting(meeting)}
                              disabled={isUpdating || deletingMeetingId === meeting.id}
                              title="Edit Meeting"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="lg"
                              onClick={() => handleDeleteMeeting(meeting.id)}
                              disabled={deletingMeetingId === meeting.id || isUpdating}
                              title="Delete Meeting"
                            >
                              {deletingMeetingId === meeting.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </>
      )}

      {/* Create Meeting Dialog */}
      {userInfo.isAdmin && users && (
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMeeting ? 'Edit Meeting' : 'Create New Meeting'}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editingMeeting ? 'Update meeting details' : 'Schedule a meeting with one or more users'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={editingMeeting ? handleUpdateMeeting : handleCreateMeeting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Team Sync"
                  required
                  className="bg-secondary border-border"
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
                  className="bg-secondary border-border"
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
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border text-foreground">
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
                <div className="border border-border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 bg-secondary">
                  {users && users.length > 0 ? (
                    users
                      .filter(u => (u.publicMetadata as any)?.role !== 'superuser')
                      .sort((a, b) => {
                        // Sort by name (first name + last name), then by email if no name
                        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.emailAddresses[0]?.emailAddress || '';
                        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.emailAddresses[0]?.emailAddress || '';
                        return nameA.localeCompare(nameB);
                      })
                      .map((user) => {
                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                        const displayName = fullName || user.emailAddresses[0]?.emailAddress || 'Unknown User';
                        const email = user.emailAddresses[0]?.emailAddress;
                        
                        return (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={formData.participantUserIds.includes(user.id)}
                              onCheckedChange={() => toggleParticipant(user.id)}
                            />
                            <label
                              htmlFor={`user-${user.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              <div className="flex flex-col">
                                <span>{displayName}</span>
                                {fullName && email && (
                                  <span className="text-xs text-muted-foreground">{email}</span>
                                )}
                              </div>
                            </label>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm text-muted-foreground">No users available</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeModal} disabled={isCreating || isUpdating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating || (!editingMeeting && formData.participantUserIds.length === 0)}>
                  {(isCreating || isUpdating) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingMeeting ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingMeeting ? 'Update Meeting' : 'Create Meeting'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
