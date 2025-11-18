# Meetings Feature

This document explains the meetings feature implementation in Vercatryx.

## Overview

The meetings feature allows administrators to schedule and manage video meetings with users using Jitsi Meet for video conferencing. Users can view their upcoming meetings and join them when they're available.

## Features

### For Users
- **View Upcoming Meetings**: Users can see all their scheduled meetings on the `/meetings` page
- **Join Meetings**: Users can join meetings 15 minutes before the scheduled time
- **Real-time Updates**: Meeting list refreshes automatically every 30 seconds
- **Meeting Details**: View meeting title, description, date, time, duration, and participant count

### For Admins (Superusers)
- **Create Meetings**: Schedule meetings with one or more users
- **Manage Meetings**: View all meetings across the platform
- **Delete Meetings**: Cancel/remove meetings as needed
- **Select Participants**: Choose which users to invite to each meeting

## Architecture

### Database Layer (`src/lib/meetings.ts`)
- File-based storage in `.data/meetings.json`
- Meeting schema includes:
  - Basic info (title, description)
  - Scheduling (scheduledAt, duration)
  - Participants (hostUserId, participantUserIds)
  - Jitsi integration (jitsiRoomName)
  - Status tracking (scheduled, in-progress, completed, cancelled)

### API Routes
- `GET /api/meetings` - List meetings (user's meetings or all meetings for admins)
- `POST /api/meetings` - Create a meeting (admin only)
- `GET /api/meetings/[meetingId]` - Get specific meeting details
- `PATCH /api/meetings/[meetingId]` - Update meeting (status, details)
- `DELETE /api/meetings/[meetingId]` - Delete a meeting
- `GET /api/meetings/upcoming` - Get upcoming meetings for current user

### User Interface

#### `/meetings` - Meetings Page
- Lists all upcoming meetings for the user
- Shows meeting cards with date, time, duration, and participant count
- "Join Meeting" button becomes available 15 minutes before scheduled time
- Auto-refreshes every 30 seconds

#### `/meetings/[meetingId]/join` - Join Meeting Page
- Embeds Jitsi Meet video conference
- Automatically updates meeting status to "in-progress" when someone joins
- Marks meeting as "completed" when all participants leave
- "Leave Meeting" button to exit the conference

#### `/admin` - Admin Dashboard (Meetings Tab)
- Create new meetings with form:
  - Title and description
  - Date/time picker
  - Duration selector (15min to 2 hours)
  - Multi-select participant list
- View all meetings across the platform
- Delete meetings

## Jitsi Meet Integration

The application uses **JaaS (Jitsi as a Service)** by 8x8 for professional video conferencing. JaaS provides better reliability, performance, and features compared to the free public instance.

### JaaS Setup Required

Before meetings will work, you need to:
1. Sign up for JaaS at [https://jaas.8x8.vc/](https://jaas.8x8.vc/)
2. Get your credentials (App ID, API Key)
3. Configure environment variables
4. See `JAAS-SETUP.md` for detailed instructions

### Why JaaS?
- ✅ **Free tier**: 25 monthly active users
- ✅ **Better reliability**: Enterprise-grade infrastructure
- ✅ **Global CDN**: Faster connections worldwide
- ✅ **Advanced features**: Recording, transcription, etc.
- ✅ **Security**: JWT-based authentication

### Features Enabled
- Audio/video controls
- Screen sharing
- Chat
- Recording (if enabled)
- Participant management
- Tile view
- Full screen mode

### Room Naming
- Rooms are named: `vercatryx-{meetingId}`
- Full room path: `{JAAS_APP_ID}/vercatryx-{meetingId}`
- This ensures unique rooms per meeting

### Security
- **JWT Authentication**: Each user gets a signed JWT token
- **Role-based access**: Host gets moderator privileges
- **Private rooms**: Only authorized participants can join
- **Token expiration**: Tokens valid for 3 hours
- **Clerk integration**: Meeting access verified against Clerk users
- Only users who are host or participants can access the meeting
- Admins can access any meeting as moderators

## Usage

### Creating a Meeting (Admin)

1. Go to `/admin`
2. Click on the "Meetings" tab
3. Click "Create Meeting"
4. Fill in the form:
   - Enter meeting title
   - Add optional description
   - Select date and time
   - Choose duration
   - Select participants (checkboxes)
5. Click "Create Meeting"

### Joining a Meeting (User)

1. Go to `/meetings`
2. Find your upcoming meeting
3. Wait until 15 minutes before the scheduled time
4. Click "Join Meeting"
5. You'll be connected to the Jitsi Meet video conference

### Meeting Lifecycle

1. **Scheduled**: Meeting is created and waiting for scheduled time
2. **In Progress**: First participant joins the meeting
3. **Completed**: All participants leave OR admin manually marks as complete
4. **Cancelled**: Admin deletes the meeting

## Technical Details

### Dependencies
- **@clerk/nextjs**: Authentication and user management
- **jsonwebtoken**: JWT generation for JaaS authentication
- **Jitsi Meet External API**: Video conferencing (loaded from 8x8.vc CDN)
- **Next.js 15**: App Router, Server Components, API Routes
- **Radix UI**: UI components (Dialog, Select, Checkbox, etc.)

### File Structure
```
src/
├── lib/
│   ├── meetings.ts                           # Meeting data layer
│   └── jaas.ts                               # JaaS JWT token generation
├── app/
│   ├── api/
│   │   └── meetings/
│   │       ├── route.ts                      # List & create meetings
│   │       ├── upcoming/route.ts             # Get upcoming meetings
│   │       └── [meetingId]/
│   │           ├── route.ts                  # Get, update, delete meeting
│   │           └── token/route.ts            # Generate JaaS JWT token
│   ├── meetings/
│   │   ├── page.tsx                          # Meetings list page
│   │   ├── page-client.tsx                   # Client component
│   │   └── [meetingId]/
│   │       └── join/
│   │           ├── page.tsx                  # Join meeting page
│   │           └── page-client.tsx           # Jitsi/JaaS integration
│   └── admin/
│       └── page-client.tsx                   # Updated with meetings tab
└── components/
    └── admin/
        └── meetings-management.tsx           # Admin meetings interface
```

### Data Storage
- Meetings are stored in `.data/meetings.json`
- File is created automatically on first meeting creation
- Data persists across server restarts

## Future Enhancements

Potential improvements for the meetings feature:

1. **Email Notifications**: Send email reminders to participants
2. **Calendar Integration**: Export meetings to Google Calendar, Outlook, etc.
3. **Recurring Meetings**: Support for repeating meetings
4. **Meeting Recording**: Store and manage meeting recordings
5. **Custom Jitsi Instance**: Self-host Jitsi for more control and branding
6. **Waiting Room**: Add a pre-meeting waiting area
7. **Meeting Notes**: Allow participants to take shared notes during meetings
8. **Analytics**: Track meeting attendance and duration
9. **Mobile App**: Native mobile app for better mobile experience
10. **Webhooks**: Notify external systems when meetings start/end

## Troubleshooting

### "JaaS credentials not configured"
- JaaS environment variables are missing or incorrect
- Check `.env.local` has all JaaS variables set
- Restart dev server after adding variables
- See `JAAS-SETUP.md` for detailed setup instructions

### Meeting Won't Load
- Check if JaaS credentials are properly configured
- Verify JWT token generation (check browser console)
- Check if Jitsi Meet script loaded from 8x8.vc (network tab)
- Verify user has permission to access the meeting
- Look for authentication errors in console

### Can't Join Meeting
- Ensure you're within the joinable time window (30 min before to 3 hours after)
- Verify meeting status is "scheduled" or "in-progress"
- Check if you're in the participants list
- Verify JWT token is being generated successfully

### "Invalid token" or Authentication Errors
- Check that JAAS_PRIVATE_KEY matches the public key in JaaS console
- Verify JAAS_APP_ID and JAAS_API_KEY_ID are correct
- Token might have expired (default: 3 hours)
- Check API Key is activated in JaaS console

### Video/Audio Issues
- Check browser permissions for camera/microphone
- Try a different browser (Chrome, Firefox recommended)
- Verify network connection
- Check firewall/corporate proxy settings

## Support

For issues or questions about the meetings feature, contact the development team or create an issue in the project repository.
