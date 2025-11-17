import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'availability-requests.json');

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({}));
  }
}

async function saveRequest(id: string, data: any) {
  await ensureDataFile();
  const content = await fs.readFile(DATA_FILE, 'utf-8');
  const requests = JSON.parse(content);
  requests[id] = data;
  await fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2));
}

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

    // Save request data
    await saveRequest(requestId, {
      id: requestId,
      name,
      email,
      company,
      phone,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Create admin link
    const adminLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/availability/${requestId}`;

    const emailContent = `
New Availability Check Request from Vercatryx Website

Someone wants to know if you're available NOW!

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}

Message:
${message || 'Not provided'}

Click one of these links to respond:

✅ I'm Available: ${adminLink}?response=available
❌ Not Available: ${adminLink}?response=unavailable

This request was made at ${new Date().toLocaleString()}
    `;

    // Create a transporter using Gmail
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
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
      subject: `🔔 URGENT: ${name} wants to talk NOW!`,
      text: emailContent,
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
