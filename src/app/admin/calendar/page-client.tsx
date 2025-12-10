"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { MeetingRequest, BlockedTimeSlot } from "@/lib/meeting-scheduling";
import type { Meeting } from "@/lib/meetings";

interface AdminCalendarClientProps {
  initialMeetingRequests: MeetingRequest[];
  initialMeetings: Meeting[];
  initialBlockedSlots: BlockedTimeSlot[];
}

export default function AdminCalendarClient({
  initialMeetingRequests,
  initialMeetings,
  initialBlockedSlots,
}: AdminCalendarClientProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const sunday = new Date(now.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  });

  const [meetingRequests, setMeetingRequests] = useState(initialMeetingRequests);
  const [meetings, setMeetings] = useState(initialMeetings);
  const [blockedSlots, setBlockedSlots] = useState(initialBlockedSlots);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null);
  const [confirmingSlot, setConfirmingSlot] = useState<string | null>(null);
  const [optimisticBlockedSlots, setOptimisticBlockedSlots] = useState<Set<string>>(new Set());
  const [optimisticUnblockedSlots, setOptimisticUnblockedSlots] = useState<Set<string>>(new Set());

  // Generate 30-minute slots for the week (always 8 AM - 9 PM for all days)
  const generateWeekSlots = () => {
    const slots: string[] = [];

    for (let day = 0; day < 7; day++) {
      // Create a fresh date for each day
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(dayDate.getDate() + day);
      dayDate.setHours(8, 0, 0, 0); // Always start at 8 AM
      dayDate.setMinutes(0);
      dayDate.setSeconds(0);
      dayDate.setMilliseconds(0);

      // Generate slots from 8 AM to 9 PM (21:00) for all days
      const slotDate = new Date(dayDate);
      while (slotDate.getHours() < 21 || (slotDate.getHours() === 21 && slotDate.getMinutes() === 0)) {
        slots.push(new Date(slotDate).toISOString());
        slotDate.setMinutes(slotDate.getMinutes() + 30);
      }
    }

    return slots;
  };

  const weekSlots = generateWeekSlots();

  // Get slot status
  const getSlotStatus = (slot: string) => {
    const slotDate = new Date(slot);
    const slotEnd = new Date(slotDate.getTime() + 30 * 60 * 1000);
    const now = new Date();
    const isPast = slotEnd < now;

    // Check optimistic blocking (instant red)
    if (optimisticBlockedSlots.has(slot) && !optimisticUnblockedSlots.has(slot)) {
      return "blocked";
    }

    // Check if blocked (skip if optimistically unblocked)
    if (!optimisticUnblockedSlots.has(slot)) {
      const isBlocked = blockedSlots.some((blocked) => {
        const blockedStart = new Date(blocked.startTime);
        const blockedEnd = new Date(blocked.endTime);
        return slotDate < blockedEnd && slotEnd > blockedStart;
      });

      if (isBlocked) return "blocked";
    }

    // Check if has scheduled meeting
    const meeting = meetings.find((m) => {
      const meetingStart = new Date(m.scheduledAt);
      const meetingEnd = new Date(meetingStart.getTime() + m.duration * 60 * 1000);
      return slotDate < meetingEnd && slotEnd > meetingStart;
    });

    if (meeting) return { type: "meeting", meeting };

    // Check pending requests for this slot (exact match)
    const pendingRequests = meetingRequests.filter((req) => {
      if (!req.selectedTimeSlots || !Array.isArray(req.selectedTimeSlots)) return false;
      // Compare ISO strings exactly
      return req.selectedTimeSlots.some((selectedSlot: string) => {
        // Normalize both to ISO strings for comparison
        const selectedDate = new Date(selectedSlot);
        return selectedDate.getTime() === slotDate.getTime();
      });
    });

    if (pendingRequests.length > 0) return "pending";

    return isPast ? "past" : "available";
  };

  const getSlotColor = (status: string | { type: string; meeting: Meeting }) => {
    if (typeof status === "object" && status.type === "meeting") {
      return "bg-blue-500/50 border-blue-500";
    }
    const statusStr = typeof status === "string" ? status : (status?.type || "available");
    switch (statusStr) {
      case "blocked":
        return "bg-red-500/50 border-red-500";
      case "meeting":
        return "bg-blue-500/50 border-blue-500";
      case "pending":
        return "bg-yellow-500/50 border-yellow-500";
      case "past":
        return "bg-gray-500/30 border-gray-500/50 opacity-50";
      case "available":
        return "bg-green-500/50 border-green-500";
      default:
        return "bg-green-500/50 border-green-500";
    }
  };

  const handleBlockSlot = async (slot: string) => {
    const slotDate = new Date(slot);
    const slotEnd = new Date(slotDate.getTime() + 30 * 60 * 1000);

    // Optimistic update - immediately show as blocked (red)
    setOptimisticBlockedSlots((prev) => new Set(prev).add(slot));
    setOptimisticUnblockedSlots((prev) => {
      const newSet = new Set(prev);
      newSet.delete(slot);
      return newSet;
    });

    try {
      const response = await fetch("/api/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: slotDate.toISOString(),
          endTime: slotEnd.toISOString(),
          reason: "Manually blocked",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to block slot");
      }

      const data = await response.json();
      setBlockedSlots([...blockedSlots, data.blockedSlot]);
      // Keep optimistic state until next refresh
      toast.success("Time slot blocked");
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticBlockedSlots((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slot);
        return newSet;
      });
      toast.error("Failed to block time slot");
      console.error(error);
    }
  };

  const handleUnblockSlot = async (blockId: string) => {
    // Find the slot time for optimistic update
    const blockedSlot = blockedSlots.find((slot) => slot.id === blockId);
    if (blockedSlot) {
      const slotStart = new Date(blockedSlot.startTime);
      const slotKey = slotStart.toISOString();
      
      // Optimistic update - immediately show as unblocked
      setOptimisticUnblockedSlots((prev) => new Set(prev).add(slotKey));
      setOptimisticBlockedSlots((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slotKey);
        return newSet;
      });
    }

    try {
      const response = await fetch(`/api/blocked-slots/${blockId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to unblock slot");
      }

      setBlockedSlots(blockedSlots.filter((slot) => slot.id !== blockId));
      toast.success("Time slot unblocked");
    } catch (error) {
      // Revert optimistic update on error
      if (blockedSlot) {
        const slotStart = new Date(blockedSlot.startTime);
        const slotKey = slotStart.toISOString();
        setOptimisticUnblockedSlots((prev) => {
          const newSet = new Set(prev);
          newSet.delete(slotKey);
          return newSet;
        });
        setOptimisticBlockedSlots((prev) => new Set(prev).add(slotKey));
      }
      toast.error("Failed to unblock time slot");
      console.error(error);
    }
  };

  const handleConfirmSlot = async (requestId: string, slot: string) => {
    setConfirmingSlot(slot);
    try {
      const response = await fetch(`/api/meeting-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSlot: slot }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to confirm slot");
      }

      const data = await response.json();
      
      // Find the request to get its details
      const request = meetingRequests.find((req) => req.id === requestId);
      
      // Optimistically add the meeting to the list
      if (data.meetingId && request) {
        // Create a temporary meeting object for immediate display
        const tempMeeting: Meeting = {
          id: data.meetingId,
          title: `Meeting with ${request.name}`,
          description: request.message || `Meeting with ${request.name}${request.company ? ` from ${request.company}` : ''}`,
          hostUserId: "", // Will be updated on refresh
          participantUserIds: [],
          participantCompanyIds: [],
          accessType: 'public',
          scheduledAt: slot,
          duration: 30,
          jitsiRoomName: "",
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          meetingRequestId: requestId,
        };
        setMeetings([...meetings, tempMeeting]);
      }
      
      // Remove from pending requests
      setMeetingRequests(meetingRequests.filter((req) => req.id !== requestId));
      
      // Refresh meetings and blocked slots in background
      const [meetingsRes, blockedRes, requestsRes] = await Promise.all([
        fetch("/api/meetings").then((r) => r.json()),
        fetch("/api/blocked-slots").then((r) => r.json()),
        fetch("/api/meeting-requests?status=pending").then((r) => r.json()),
      ]);

      if (meetingsRes.meetings) setMeetings(meetingsRes.meetings);
      if (blockedRes.blockedSlots) {
        setBlockedSlots(blockedRes.blockedSlots);
        // Clear optimistic states after refresh
        setOptimisticBlockedSlots(new Set());
        setOptimisticUnblockedSlots(new Set());
      }
      if (requestsRes.requests) setMeetingRequests(requestsRes.requests);

      toast.success("Meeting confirmed and email sent!");
      setSelectedRequest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to confirm meeting");
      console.error(error);
    } finally {
      setConfirmingSlot(null);
    }
  };

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const sunday = new Date(now.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
  };

  // Group slots by day
  const slotsByDay: Record<string, string[]> = {};
  weekSlots.forEach((slot) => {
    const date = new Date(slot);
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayKey = `${year}-${month}-${day}`;
    if (!slotsByDay[dayKey]) {
      slotsByDay[dayKey] = [];
    }
    slotsByDay[dayKey].push(slot);
  });
  
  // Sort slots within each day by time
  Object.keys(slotsByDay).forEach((dayKey) => {
    slotsByDay[dayKey].sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
  });

  // Get days of the week
  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    daysOfWeek.push(date);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Calendar Management</h1>
        <p className="text-muted-foreground">
          Manage your schedule, block times, and confirm meeting requests
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Week
            </Button>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
              <div className="text-sm font-medium">
                {currentWeekStart.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(
                  currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000
                ).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              Next Week
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/50 border border-green-500 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500/50 border border-yellow-500 rounded"></div>
              <span>Pending Request</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500/50 border border-blue-500 rounded"></div>
              <span>Scheduled Meeting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/50 border border-red-500 rounded"></div>
              <span>Blocked</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-7 gap-2">
              {/* Day Headers - Sticky */}
              <div className="contents">
                {daysOfWeek.map((day, dayIndex) => (
                  <div key={`header-${dayIndex}`} className="sticky top-0 bg-background z-10 pb-2">
                    <div className="text-center">
                      <div className="text-sm font-medium">{dayNames[day.getDay()]}</div>
                      <div className="text-xs text-muted-foreground">{day.getDate()}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slots - All scroll together */}
              {daysOfWeek.map((day, dayIndex) => {
                // Use local date to match slot grouping
                const year = day.getFullYear();
                const month = String(day.getMonth() + 1).padStart(2, '0');
                const dayNum = String(day.getDate()).padStart(2, '0');
                const dayKey = `${year}-${month}-${dayNum}`;
                const daySlots = slotsByDay[dayKey] || [];
                const isClosed = day.getDay() === 6; // Saturday
                const isFriday = day.getDay() === 5; // Friday

                return (
                  <div key={dayIndex} className="space-y-1">
                    {daySlots.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        No slots
                      </div>
                    ) : (
                      daySlots.map((slot) => {
                        const status = getSlotStatus(slot);
                        const slotDate = new Date(slot);
                        const slotEnd = new Date(slotDate.getTime() + 30 * 60 * 1000);
                        const now = new Date();
                        const isPast = slotEnd < now;
                        const timeString = slotDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        });

                        // Extract meeting info if status is a meeting
                        const meetingInfo = typeof status === "object" && status.type === "meeting" ? status.meeting : null;
                        const statusStr = typeof status === "string" ? status : (status.type || "available");

                        // Check if slot should be disabled
                        let isDisabled = false;
                        if (isClosed) {
                          isDisabled = true; // Saturday is closed
                        } else if (isFriday && slotDate.getHours() >= 13) {
                          isDisabled = true; // Friday after 1pm
                        }

                        // Find blocked slot for this time
                        const blockedSlot = blockedSlots.find((blocked) => {
                          const blockedStart = new Date(blocked.startTime);
                          const blockedEnd = new Date(blocked.endTime);
                          return slotDate >= blockedStart && slotDate < blockedEnd;
                        });

                        // Get meeting request name if this is from a meeting request
                        let meetingName = "";
                        if (meetingInfo) {
                          // First try to find the meeting request
                          if (meetingInfo.meetingRequestId) {
                            const request = meetingRequests.find((r) => r.id === meetingInfo.meetingRequestId);
                            if (request) {
                              meetingName = request.name;
                            }
                          }
                          // If not found, extract from title (format: "Meeting with {name}")
                          if (!meetingName && meetingInfo.title) {
                            const titleMatch = meetingInfo.title.match(/Meeting with (.+)/);
                            if (titleMatch) {
                              meetingName = titleMatch[1];
                            } else {
                              // Fallback: use title as name
                              meetingName = meetingInfo.title;
                            }
                          }
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              if (statusStr === "blocked" && blockedSlot) {
                                handleUnblockSlot(blockedSlot.id);
                              } else if (statusStr === "available" && !isDisabled && !isPast) {
                                handleBlockSlot(slot);
                              }
                            }}
                            disabled={(isDisabled || isPast) && statusStr !== "blocked"}
                            className={`w-full text-xs py-2 px-2 rounded border transition-all ${
                              isPast
                                ? "bg-gray-500/30 text-muted-foreground border-gray-500/50 opacity-50 cursor-not-allowed"
                                : isDisabled && !blockedSlot
                                ? isClosed
                                  ? "bg-secondary/30 text-muted-foreground border-border cursor-not-allowed opacity-40 blur-[0.5px]"
                                  : "bg-secondary/50 text-muted-foreground border-border cursor-not-allowed opacity-50"
                                : getSlotColor(status)
                            } ${
                              (statusStr === "available" || statusStr === "blocked") && !isDisabled && !isPast
                                ? "hover:opacity-80 cursor-pointer"
                                : "cursor-default"
                            }`}
                            title={
                              isPast
                                ? "Past time slot"
                                : isClosed
                                ? "Saturday - Closed"
                                : isFriday && slotDate.getHours() >= 13
                                ? "Friday - Closed after 1pm"
                                : statusStr === "blocked"
                                ? "Click to unblock"
                                : statusStr === "available"
                                ? "Click to block"
                                : statusStr === "pending"
                                ? "Has pending requests - click to view"
                                : statusStr === "meeting" && meetingName
                                ? `Meeting with ${meetingName}`
                                : "Scheduled meeting"
                            }
                          >
                            <div>{timeString}</div>
                            {statusStr === "pending" && (
                              <div className="text-[10px] mt-0.5">
                                ({meetingRequests.filter((r) => {
                                  if (!r.selectedTimeSlots || !Array.isArray(r.selectedTimeSlots)) return false;
                                  return r.selectedTimeSlots.some((selectedSlot: string) => {
                                    const selectedDate = new Date(selectedSlot);
                                    return selectedDate.getTime() === slotDate.getTime();
                                  });
                                }).length})
                              </div>
                            )}
                            {statusStr === "meeting" && meetingName && (
                              <div className="text-[10px] mt-0.5 truncate" title={meetingName}>
                                {meetingName}
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Meeting Requests Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4">Pending Requests ({meetingRequests.length})</h2>
            
            {meetingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {meetingRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedRequest?.id === request.id
                        ? "border-brand-blue bg-brand-blue/10"
                        : "border-border hover:border-brand-blue/50"
                    }`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="font-medium text-sm">{request.name}</div>
                    <div className="text-xs text-muted-foreground">{request.email}</div>
                    {request.company && (
                      <div className="text-xs text-muted-foreground">{request.company}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {request.selectedTimeSlots.length} time slot
                      {request.selectedTimeSlots.length !== 1 ? "s" : ""} selected
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Request Details */}
          {selectedRequest && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold">Request Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div>
                  <span className="font-medium">Name:</span> {selectedRequest.name}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {selectedRequest.email}
                </div>
                {selectedRequest.company && (
                  <div>
                    <span className="font-medium">Company:</span> {selectedRequest.company}
                  </div>
                )}
                <div>
                  <span className="font-medium">Phone:</span> {selectedRequest.phone}
                </div>
                {selectedRequest.message && (
                  <div>
                    <span className="font-medium">Message:</span>
                    <p className="text-muted-foreground mt-1">{selectedRequest.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="font-medium text-sm mb-2">Select a time to confirm:</div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {selectedRequest.selectedTimeSlots
                    .sort()
                    .map((slot) => {
                      const slotDate = new Date(slot);
                      const status = getSlotStatus(slot);
                      const isAvailable = status === "available" || status === "pending";

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            if (isAvailable) {
                              handleConfirmSlot(selectedRequest.id, slot);
                            }
                          }}
                          disabled={!isAvailable || confirmingSlot === slot}
                          className={`w-full text-left text-xs py-2 px-3 rounded border transition-all ${
                            isAvailable
                              ? "border-green-500 bg-green-500/10 hover:bg-green-500/20 cursor-pointer"
                              : "border-border bg-secondary/50 cursor-not-allowed opacity-50"
                          }`}
                        >
                          <div className="font-medium">
                            {slotDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div>
                            {slotDate.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                          {confirmingSlot === slot && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Confirming...
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

