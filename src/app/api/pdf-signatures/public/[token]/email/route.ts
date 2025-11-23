import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getPdfSignatureRequestByToken, getPdfKeyFromUrl, getSignaturesForRequest } from '@/lib/pdf-signatures';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }
  return Buffer.concat(chunks);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email : undefined;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get the PDF signature request
    const request = await getPdfSignatureRequestByToken(token);
    if (!request || !request.pdf_file_url) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Check if the document is fully signed (all fields completed)
    // Only use signed PDF if the request status is 'completed' (meaning ALL fields are filled)
    const isSigned = request.status === 'completed';
    
    // Get signed PDF URL if document is fully signed
    let pdfUrl = request.pdf_file_url;
    if (isSigned) {
      const signatures = await getSignaturesForRequest(request.id);
      const signedPdfUrl = signatures.length > 0 && signatures[0].signed_pdf_url 
        ? signatures[0].signed_pdf_url 
        : null;
      if (signedPdfUrl) {
        pdfUrl = signedPdfUrl;
      }
    }
    
    const key = getPdfKeyFromUrl(pdfUrl);

    // Fetch PDF from R2
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const object = await r2Client.send(command);
    if (!object.Body) {
      return NextResponse.json(
        { error: 'Failed to load PDF' },
        { status: 500 }
      );
    }

    const pdfBuffer = await streamToBuffer(object.Body);

    // Create email transporter using Zoho Mail
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'dh@vercatryx.com',
        pass: process.env.ZOHO_APP_PASSWORD,
      },
    });

    const subject = isSigned 
      ? `Your signed document: ${request.title}`
      : `Your document: ${request.title}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #333;">Document from Vercatryx</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Please find attached your ${isSigned ? 'signed' : ''} document: <strong>${request.title}</strong></p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>The Vercatryx Team</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
    `;

    const textBody = `
Document from Vercatryx

Hello,

Please find attached your ${isSigned ? 'signed' : ''} document: ${request.title}

If you have any questions, please don't hesitate to contact us.

Best regards,
The Vercatryx Team

---
This is an automated email. Please do not reply to this message.
    `;

    // Send email with PDF attachment
    await transporter.sendMail({
      from: '"Vercatryx" <dh@vercatryx.com>',
      to: email,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename: `${request.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error sending PDF via email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

