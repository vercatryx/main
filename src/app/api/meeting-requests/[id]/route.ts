import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { confirmMeetingRequest, getMeetingRequest } from '@/lib/meeting-scheduling';
import { requireCompanyAdmin, isSuperAdmin } from '@/lib/permissions';
import nodemailer from 'nodemailer';

// PATCH - Confirm a meeting request (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { selectedSlot } = body;

    if (!selectedSlot) {
      return NextResponse.json(
        { error: 'selectedSlot is required' },
        { status: 400 }
      );
    }

    // Confirm the meeting request
    const result = await confirmMeetingRequest(id, selectedSlot, userId);

    // Generate meeting link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const meetingLink = `${baseUrl}/meetings/${result.meetingId}/join`;

    // Send confirmation email to user
    const confirmedDate = new Date(selectedSlot);
    const formattedDate = confirmedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = confirmedDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

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
    .info-row { margin: 15px 0; padding: 12px; background: #22c55e; border-radius: 6px; }
    .info-label { font-weight: bold; color: #fff; margin-bottom: 4px; }
    .info-value { color: #fff; font-size: 18px; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${baseUrl}/logo-small-white.svg" alt="Vercatryx Logo" />
      <h1>Meeting Confirmed!</h1>
    </div>

    <div class="content">
      <p>Hi ${result.meetingRequest.name},</p>
      
      <p>Great news! We've confirmed your meeting request.</p>

      <div class="info-row">
        <div class="info-label">Confirmed Date & Time</div>
        <div class="info-value">${formattedDate} at ${formattedTime}</div>
      </div>

      <div style="margin: 30px 0; padding: 20px; background: #222; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 15px 0; font-weight: bold; color: #fff;">Join the Meeting</p>
        <a href="${meetingLink}" style="display: inline-block; padding: 14px 28px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Join Meeting</a>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #888; word-break: break-all;">${meetingLink}</p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">This is a public meeting link. Anyone with this link can join.</p>
      </div>

      <p style="margin-top: 30px;">
        We're looking forward to speaking with you. If you need to reschedule or have any questions, please don't hesitate to reach out.
      </p>

      <p style="margin-top: 20px;">
        Best regards,<br>
        The Vercatryx Team
      </p>
    </div>

    <div class="footer">
      <p>This email was sent from Vercatryx</p>
      <p>Confirmed at ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    const textBody = `
Meeting Confirmed!

Hi ${result.meetingRequest.name},

Great news! We've confirmed your meeting request.

Confirmed Date & Time: ${formattedDate} at ${formattedTime}

Join the Meeting:
${meetingLink}

This is a public meeting link. Anyone with this link can join.

We're looking forward to speaking with you. If you need to reschedule or have any questions, please don't hesitate to reach out.

Best regards,
The Vercatryx Team

---
Confirmed at ${new Date().toLocaleString()}
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
      to: result.meetingRequest.email,
      subject: `Meeting Confirmed - ${formattedDate} at ${formattedTime}`,
      html: htmlBody,
      text: textBody,
      replyTo: zohoEmail,
    });

    return NextResponse.json({ 
      meetingRequest: result.meetingRequest,
      meetingId: result.meetingId,
      meetingLink: meetingLink
    });
  } catch (error) {
    console.error('Error confirming meeting request:', error);
    return NextResponse.json(
      { error: 'Failed to confirm meeting request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a meeting request (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const supabase = (await import('@/lib/supabase')).getServerSupabaseClient();

    // Update status to cancelled
    const { data, error } = await supabase
      .from('meeting_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling meeting request:', error);
      return NextResponse.json(
        { error: 'Failed to cancel meeting request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ meetingRequest: data });
  } catch (error) {
    console.error('Error cancelling meeting request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel meeting request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

