import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSlots, filterAvailableSlots, AVAILABILITY_RULES } from '@/lib/meeting-scheduling';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get available time slots for a date range (public)
export async function GET(request: NextRequest) {
  // Wrap everything in try-catch to ensure we always return JSON
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to next 4 weeks if not provided
    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    const endDate = endDateParam 
      ? new Date(endDateParam) 
      : new Date(startDate.getTime() + 4 * 7 * 24 * 60 * 60 * 1000); // 4 weeks from start

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    // Generate all possible slots based on availability rules
    let allSlots: string[] = [];
    try {
      allSlots = generateTimeSlots(startDate, endDate, AVAILABILITY_RULES);
    } catch (error) {
      console.error('Error generating slots:', error);
      return NextResponse.json(
        { error: 'Failed to generate time slots', slots: [], count: 0 },
        { status: 500 }
      );
    }

    // Filter out blocked slots and existing meetings
    // If filtering fails, return all slots (graceful degradation)
    let availableSlots: string[] = [];
    try {
      availableSlots = await filterAvailableSlots(allSlots, startDate, endDate);
    } catch (error) {
      console.error('Error filtering slots, returning all slots:', error);
      // If filtering fails (e.g., database tables don't exist yet), return all generated slots
      availableSlots = allSlots;
    }

    return NextResponse.json({ 
      slots: availableSlots || [],
      count: (availableSlots || []).length 
    });
  } catch (error) {
    console.error('Unexpected error in available-slots route:', error);
    // Always return JSON, never HTML - this is critical
    return NextResponse.json(
      { 
        error: 'Failed to get available slots', 
        details: error instanceof Error ? error.message : 'Unknown error',
        slots: [],
        count: 0
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

