"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TimeSlotPickerProps {
  selectedSlots: string[];
  onSlotsChange: (slots: string[]) => void;
  availableSlots?: string[]; // If provided, only show these slots
}

export default function TimeSlotPicker({
  selectedSlots,
  onSlotsChange,
  availableSlots,
}: TimeSlotPickerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day; // Get Sunday of current week
    const sunday = new Date(now.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  });

  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);

  // Generate all possible slots for the week (8 AM - 9 PM for all days)
  const generateAllWeekSlots = () => {
    const allSlots: string[] = [];
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
        allSlots.push(new Date(slotDate).toISOString());
        slotDate.setMinutes(slotDate.getMinutes() + 30);
      }
    }
    return allSlots;
  };

  // Generate time slots for the current week
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      setLoading(true);
      try {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 7); // 7 days from start

        const response = await fetch(
          `/api/meeting-requests/available-slots?startDate=${currentWeekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        );

        // Check content type to ensure we got JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error("API returned non-JSON response:", text.substring(0, 200));
          throw new Error(`Server returned invalid response (${response.status})`);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error("API error:", errorData);
          throw new Error(errorData.error || `Failed to fetch available slots (${response.status})`);
        }

        const data = await response.json();
        setSlots(data.slots || []);
      } catch (error) {
        console.error("Error fetching slots:", error);
        // On error, show all slots as available (graceful degradation)
        // This allows users to still select times even if the API fails
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [currentWeekStart]);

  // Generate all slots for display (8 AM - 9 PM for all days)
  const allWeekSlots = generateAllWeekSlots();
  
  // Use provided availableSlots if available, otherwise use fetched slots
  // Create a Set of timestamps for efficient lookup (avoid timezone/format issues)
  const availableSlotsTimestamps = new Set<number>();
  const availableSlotsArray = availableSlots || slots;
  
  // If we have available slots, use them; otherwise assume all slots are available (graceful degradation)
  const hasAvailableSlots = availableSlotsArray.length > 0;
  
  if (hasAvailableSlots) {
    availableSlotsArray.forEach((slot: string) => {
      const slotDate = new Date(slot);
      availableSlotsTimestamps.add(slotDate.getTime());
    });
  }
  
  // Helper to check if a slot is available
  const isSlotAvailable = (slot: string): boolean => {
    // If no available slots were fetched (API error), assume all slots are available
    if (!hasAvailableSlots) return true;
    
    const slotDate = new Date(slot);
    return availableSlotsTimestamps.has(slotDate.getTime());
  };

  const toggleSlot = (slot: string) => {
    const slotTime = new Date(slot).getTime();
    const isSelected = selectedSlots.some((s) => new Date(s).getTime() === slotTime);
    
    if (isSelected) {
      onSlotsChange(selectedSlots.filter((s) => new Date(s).getTime() !== slotTime));
    } else {
      onSlotsChange([...selectedSlots, slot]);
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

  // Group all slots by day (including unavailable ones)
  const slotsByDay: Record<string, string[]> = {};
  allWeekSlots.forEach((slot) => {
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

  // Check if a day is Saturday (closed)
  const isDayClosed = (date: Date) => {
    return date.getDay() === 6; // Saturday
  };

  // Check if a day is Friday (only 8am-1pm)
  const isFriday = (date: Date) => {
    return date.getDay() === 5; // Friday
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToPreviousWeek}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Week
        </Button>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          <div className="text-sm font-medium text-foreground">
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToNextWeek}
          className="flex items-center gap-2"
        >
          Next Week
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Time Slots Grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading available time slots...
        </div>
      ) : (
        <div className="max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers - Sticky */}
            <div className="contents">
              {daysOfWeek.map((day, dayIndex) => (
                <div key={`header-${dayIndex}`} className="sticky top-0 bg-background z-10 pb-2">
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">
                      {dayNames[day.getDay()]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {day.getDate()}
                    </div>
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
                const isClosed = isDayClosed(day);
                const isFri = isFriday(day);

                return (
                  <div key={dayIndex} className="space-y-1">
                    {daySlots.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        No slots
                      </div>
                    ) : (
                      daySlots.map((slot) => {
                        const slotDate = new Date(slot);
                        const timeString = slotDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        });
                        const isSelected = selectedSlots.some((s) => {
                          const sDate = new Date(s);
                          return sDate.getTime() === slotDate.getTime();
                        });
                        const isPast = slotDate < new Date();
                        const isAvailable = isSlotAvailable(slot);
                        
                        // Check if this slot should be disabled
                        let isDisabled = isPast || !isAvailable;
                        
                        // Friday: disable slots after 1pm
                        if (isFri && slotDate.getHours() >= 13) {
                          isDisabled = true;
                        }
                        
                        // Saturday: all slots disabled (closed)
                        if (isClosed) {
                          isDisabled = true;
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => !isDisabled && toggleSlot(slot)}
                            disabled={isDisabled}
                            className={`w-full text-xs py-2 px-2 rounded border transition-all ${
                              isSelected
                                ? "bg-brand-blue text-white border-brand-blue"
                                : isDisabled
                                ? isClosed
                                  ? "bg-secondary/30 text-muted-foreground border-border cursor-not-allowed opacity-40 blur-[0.5px]"
                                  : "bg-secondary/50 text-muted-foreground border-border cursor-not-allowed opacity-50"
                                : "bg-card text-foreground border-border hover:border-brand-blue hover:bg-brand-blue/10"
                            }`}
                          >
                            {timeString}
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Selected Slots Summary */}
      {selectedSlots.length > 0 && (
        <div className="mt-4 p-4 bg-card border border-border rounded-lg">
          <div className="text-sm font-medium text-foreground mb-2">
            Selected Time Slots ({selectedSlots.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSlots
              .sort()
              .map((slot) => {
                const date = new Date(slot);
                return (
                  <div
                    key={slot}
                    className="text-xs px-2 py-1 bg-brand-blue/20 text-brand-blue rounded border border-brand-blue/30"
                  >
                    {date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {date.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

