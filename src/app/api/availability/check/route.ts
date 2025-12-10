import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import { saveAvailabilityRequest, type AvailabilityRequest } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, phone, message } = body;

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique ID
    const requestId = randomUUID();

    // Save request data to database
    const requestData: AvailabilityRequest = {
      id: requestId,
      name,
      email,
      company,
      phone,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await saveAvailabilityRequest(requestData);

    // Create admin link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const adminLink = `${baseUrl}/admin/availability/${requestId}`;
    const availableLink = `${adminLink}?response=available`;
    const unavailableLink = `${adminLink}?response=unavailable`;

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
    .urgent-badge { display: inline-block; background: #e44848; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-top: 10px; }
    .content { background: #1a1a1a; padding: 30px; border-radius: 0 0 12px 12px; color:#dcdcdc; }
    .info-row { margin: 15px 0; padding: 12px; background: #222; border-radius: 6px; }
    .info-label { font-weight: bold; color: #fff; margin-bottom: 4px; }
    .info-value { color: #dcdcdc; }
    .message-box { margin: 20px 0; padding: 15px; background: #222; border-left: 3px solid #e44848; border-radius: 6px; }
    .action-buttons { margin: 30px 0; text-align: center; }
    .button { display: inline-block; padding: 14px 28px; margin: 8px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
    .button-available { background: #22c55e; color: white; }
    .button-unavailable { background: #737373; color: white; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 14px; }
    .timestamp { color: #a3a3a3; font-size: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${baseUrl}/logo-small-white.svg" alt="Vercatryx Logo" />
      <h1>🔔 Urgent: Someone Wants to Talk NOW!</h1>
      <div class="urgent-badge">AVAILABILITY CHECK</div>
    </div>

    <div class="content">
      <p style="font-size: 18px; color: #fff; margin-bottom: 25px;">
        <strong>${name}</strong> is checking if someone is available to talk right now.
      </p>

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

      ${message ? `
      <div class="message-box">
        <div class="info-label">Message</div>
        <div class="info-value" style="white-space: pre-wrap;">${message}</div>
      </div>
      ` : ''}

      <div class="action-buttons">
        <a href="${availableLink}" class="button button-available">✅ I'm Available</a>
        <a href="${unavailableLink}" class="button button-unavailable">❌ Not Available</a>
      </div>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
        <strong>Quick Actions:</strong><br>
        <a href="mailto:${email}" style="color: #60a5fa; text-decoration: none;">Reply via Email</a> | 
        <a href="tel:${phone}" style="color: #60a5fa; text-decoration: none;">Call ${name}</a> | 
        <a href="${adminLink}" style="color: #60a5fa; text-decoration: none;">View Full Details</a>
      </p>

      <div class="timestamp">
        Request made at ${new Date().toLocaleString()}
      </div>
    </div>

    <div class="footer">
      <p>This is an urgent availability check request</p>
      <p>Please respond as soon as possible</p>
    </div>
  </div>
</body>
</html>
    `;

    const textBody = `
🔔 URGENT: Someone Wants to Talk NOW!

New Availability Check Request from Vercatryx Website

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Phone: ${phone}

Message:
${message || 'Not provided'}

Click one of these links to respond:

✅ I'm Available: ${availableLink}
❌ Not Available: ${unavailableLink}

View Full Details: ${adminLink}

Quick Actions:
Reply via Email: ${email}
Call: ${phone}

---
Request made at ${new Date().toLocaleString()}
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
      subject: `🔔 URGENT: ${name} wants to talk NOW!${company ? ` (${company})` : ''}`,
      html: htmlBody,
      text: textBody,
      replyTo: email,
    });

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error('Error processing availability check:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
