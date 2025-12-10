import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createMeetingRequest, getMeetingRequests } from '@/lib/meeting-scheduling';
import { requireCompanyAdmin, isSuperAdmin } from '@/lib/permissions';
import nodemailer from 'nodemailer';

// POST - Create a meeting request (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, phone, message, selectedTimeSlots } = body;

    // Validate required fields
    if (!name || !email || !phone || !selectedTimeSlots || !Array.isArray(selectedTimeSlots) || selectedTimeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, phone, and at least one time slot are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create the meeting request
    let meetingRequest;
    try {
      meetingRequest = await createMeetingRequest({
        name,
        email,
        company,
        phone,
        message,
        selectedTimeSlots,
      });
    } catch (error) {
      console.error('Error creating meeting request in database:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create meeting request', 
          details: error instanceof Error ? error.message : 'Database error occurred'
        },
        { status: 500 }
      );
    }

    // Send email notification to admin (don't fail the request if email fails)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const calendarUrl = `${baseUrl}/admin/calendar`;
    
      // Format selected time slots for display
      const formattedSlots = selectedTimeSlots
        .map((slot: string) => {
          const date = new Date(slot);
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }) + ' at ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        })
        .join('<br>');

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #e6e6e6; background:#0f0f0f; margin:0; padding:0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background:#111; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .header img { width: 90px; margin-bottom: 18px; }
    .header h1 { margin: 0; font-size: 26px; color: #fff; font-weight: 700; letter-spacing: 1px; }
    .content { background: #1a1a1a; padding: 30px; border-radius: 0 0 12px 12px; color:#dcdcdc; }
    .info-row { margin: 15px 0; padding: 12px; background: #222; border-radius: 6px; }
    .info-label { font-weight: bold; color: #fff; margin-bottom: 4px; }
    .info-value { color: #dcdcdc; }
    .button { display: inline-block; padding: 14px 28px; margin: 20px 0; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${baseUrl}/logo-small-white.svg" alt="Vercatryx Logo" />
      <h1>New Meeting Request</h1>
    </div>

    <div class="content">
      <p>You have received a new meeting request from the Vercatryx website.</p>

      <div class="info-row">
        <div class="info-label">Name</div>
        <div class="info-value">${name}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Email</div>
        <div class="info-value"><a href="mailto:${email}" style="color: #60a5fa;">${email}</a></div>
      </div>

      <div class="info-row">
        <div class="info-label">Phone</div>
        <div class="info-value"><a href="tel:${phone}" style="color: #60a5fa;">${phone}</a></div>
      </div>

      ${company ? `
      <div class="info-row">
        <div class="info-label">Company</div>
        <div class="info-value">${company}</div>
      </div>
      ` : ''}

      <div class="info-row">
        <div class="info-label">Selected Time Slots (${selectedTimeSlots.length})</div>
        <div class="info-value">${formattedSlots}</div>
      </div>

      ${message ? `
      <div class="info-row">
        <div class="info-label">Message</div>
        <div class="info-value" style="white-space: pre-wrap;">${message}</div>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${calendarUrl}" class="button">View & Confirm Time on Calendar</a>
      </div>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
        <strong>Quick Actions:</strong><br>
        <a href="mailto:${email}" style="color: #60a5fa; text-decoration: none;">Reply via Email</a> | 
        <a href="tel:${phone}" style="color: #60a5fa; text-decoration: none;">Call ${name}</a>
      </p>
    </div>

    <div class="footer">
      <p>This email was sent from the Vercatryx meeting request system</p>
      <p>Request submitted at ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
      `;

      const textBody = `
New Meeting Request from Vercatryx Website

Name: ${name}
Email: ${email}
Phone: ${phone}
${company ? `Company: ${company}` : ''}

Selected Time Slots (${selectedTimeSlots.length}):
${selectedTimeSlots.map((slot: string) => {
  const date = new Date(slot);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}).join('\n')}

${message ? `Message: ${message}` : ''}

View & Confirm Time: ${calendarUrl}

---
Request submitted at ${new Date().toLocaleString()}
Reply to: ${email}
      `;

      // Create a transporter using Zoho
      const zohoEmail = process.env.ZOHO_EMAIL || 'info@vercatryx.com';
      const transporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: {
          user: zohoEmail,
          pass: process.env.ZOHO_APP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Send email
      await transporter.sendMail({
        from: `"Vercatryx" <${zohoEmail}>`,
        to: 'hshloimie@gmail.com',
        subject: `New Meeting Request from ${name}${company ? ` (${company})` : ''} - ${selectedTimeSlots.length} time slot${selectedTimeSlots.length !== 1 ? 's' : ''}`,
        html: htmlBody,
        text: textBody,
        replyTo: email,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Error sending meeting request notification email:', emailError);
    }

    return NextResponse.json({ meetingRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting request:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Get all meeting requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const superAdmin = await isSuperAdmin();
    const companyAdmin = await requireCompanyAdmin().catch(() => null);

    if (!superAdmin && !companyAdmin) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'confirmed' | 'cancelled' | undefined;

    const requests = await getMeetingRequests(status);

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error getting meeting requests:', error);
    return NextResponse.json(
      { error: 'Failed to get meeting requests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

