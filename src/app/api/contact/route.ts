import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, phone, preferredContact, callbackTime, message } = body;

    // Validate required fields
    if (!name || !email || !phone || !preferredContact) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
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
    .message-box { margin: 20px 0; padding: 15px; background: #222; border-left: 3px solid #e44848; border-radius: 6px; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${baseUrl}/logo-small-white.svg" alt="Vercatryx Logo" />
      <h1>New Contact Form Submission</h1>
    </div>

    <div class="content">
      <p>You have received a new contact form submission from the Vercatryx website.</p>

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
        <div class="info-label">Preferred Contact Method</div>
        <div class="info-value">${preferredContact}</div>
      </div>

      ${callbackTime ? `
      <div class="info-row">
        <div class="info-label">Available Times</div>
        <div class="info-value">${callbackTime}</div>
      </div>
      ` : ''}

      ${message ? `
      <div class="message-box">
        <div class="info-label">Message</div>
        <div class="info-value" style="white-space: pre-wrap;">${message}</div>
      </div>
      ` : ''}

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
        <strong>Quick Actions:</strong><br>
        <a href="mailto:${email}" style="color: #60a5fa; text-decoration: none;">Reply via Email</a> | 
        <a href="tel:${phone}" style="color: #60a5fa; text-decoration: none;">Call ${name}</a>
      </p>
    </div>

    <div class="footer">
      <p>This email was sent from the Vercatryx contact form</p>
      <p>Submitted at ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    const textBody = `
New Contact Form Submission from Vercatryx Website

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Phone: ${phone}
Preferred Contact Method: ${preferredContact}
Available Times: ${callbackTime || 'Not specified'}

Message:
${message || 'No message provided'}

---
Submitted at ${new Date().toLocaleString()}
Reply to: ${email}
    `;

    // Create a transporter using Gmail with explicit configuration
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'hshloimie@gmail.com',
      subject: `New Contact Form Submission from ${name}${company ? ` (${company})` : ''}`,
      html: htmlBody,
      text: textBody,
      replyTo: email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
