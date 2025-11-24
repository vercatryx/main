import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getCurrentUser, isSuperAdmin, getUserPermissions } from "@/lib/permissions";
import { createEmailRecord } from "@/lib/email-tracking";

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const superAdmin = await isSuperAdmin();
    const permissions = await getUserPermissions();

    if (!superAdmin && !permissions.isCompanyAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only admins can send emails." },
        { status: 403 }
      );
    }

    // Parse FormData (for file attachments) or JSON
    const contentType = request.headers.get("content-type") || "";
    let to: string | string[];
    let subject: string;
    let htmlBody: string;
    let textBody: string;
    let replyTo: string | undefined;
    let attachments: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const toStr = formData.get("to") as string;
      to = JSON.parse(toStr);
      subject = formData.get("subject") as string;
      htmlBody = formData.get("htmlBody") as string;
      textBody = formData.get("textBody") as string;
      replyTo = formData.get("replyTo") as string | undefined;
      
      // Get all attachment files (filter out empty files)
      const attachmentFiles = formData.getAll("attachments");
      attachments = attachmentFiles.filter(
        (file) => file instanceof File && file.size > 0
      ) as File[];
    } else {
      const body = await request.json();
      to = body.to;
      subject = body.subject;
      htmlBody = body.htmlBody;
      textBody = body.textBody;
      replyTo = body.replyTo;
    }

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { error: "Recipient email and subject are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : [to];
    
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: `Invalid email address: ${email}` },
          { status: 400 }
        );
      }
    }

    // Create Zoho Mail transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.ZOHO_EMAIL || "dh@vercatryx.com",
        pass: process.env.ZOHO_APP_PASSWORD,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error("SMTP configuration error:", verifyError);
      return NextResponse.json(
        { error: "Email service configuration error. Please check your Zoho credentials." },
        { status: 500 }
      );
    }

    // Get current user info for signature
    const currentUser = await getCurrentUser();
    const adminName = currentUser
      ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || currentUser.email
      : "Vercatryx Admin";
    const adminEmail = currentUser?.email || process.env.ZOHO_EMAIL || "dh@vercatryx.com";

    // Prepare email message content
    const messageContent = htmlBody || textBody?.replace(/\n/g, "<br>") || "";
    
    // Use R2 CDN URL for logo (more reliable in emails)
    const logoUrl = "https://pub-3262ca71dcb145ff94d22f828c1b9057.r2.dev/logo-small-color.svg"
    
    // Get base URL for any other links in the email
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      // Try to get from request headers (for production deployments)
      const host = request.headers.get("host");
      const protocol = request.headers.get("x-forwarded-proto") || 
                       (request.headers.get("x-forwarded-ssl") === "on" ? "https" : null) ||
                       "https";
      
      if (host) {
        baseUrl = `${protocol}://${host}`;
      } else {
        // Fall back to VERCEL_URL or default
        const vercelUrl = process.env.VERCEL_URL;
        if (vercelUrl) {
          baseUrl = `https://${vercelUrl}`;
        } else {
          baseUrl = "http://localhost:3000";
        }
      }
    }
    
    // Ensure baseUrl doesn't end with a slash
    baseUrl = baseUrl.replace(/\/$/, "");
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #e6e6e6; 
      background: #0f0f0f; 
      margin: 0; 
      padding: 0; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { 
      background: #111; 
      padding: 40px 20px; 
      text-align: center; 
      border-radius: 12px 12px 0 0; 
    }
    .header img { 
      width: 180px; 
      margin-bottom: 18px; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 26px; 
      color: #fff; 
      font-weight: 700; 
      letter-spacing: 1px; 
    }
    .content { 
      background: #1a1a1a; 
      padding: 30px; 
      border-radius: 0 0 12px 12px; 
      color: #dcdcdc; 
    }
    .message-content {
      word-wrap: break-word;
      line-height: 1.8;
    }
    .message-content p {
      margin: 0 0 1em 0;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content br {
      line-height: 1.8;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #333;
    }
    .signature p {
      margin: 5px 0;
    }
    .footer { 
      text-align: center; 
      margin-top: 20px; 
      color: #888; 
      font-size: 14px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Vercatryx Logo" />
      <h1>Vercatryx</h1>
    </div>

    <div class="content">
      <div class="message-content">
        ${messageContent}
      </div>

      <div class="signature">
        <p>Best regards,</p>
        <p><strong>${adminName}</strong></p>
        <p>Vercatryx Team</p>
      </div>
    </div>

    <div class="footer">
      <p>This email was sent from Vercatryx</p>
      <p>If you have any questions, please reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Create plain text version
    let textContent = textBody || htmlBody?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\n+/g, "\n") || "";
    if (textContent) {
      textContent = `${textContent}\n\n---\nBest regards,\n${adminName}\nVercatryx Team`;
    }

    // Prepare attachments for nodemailer
    const emailAttachments = await Promise.all(
      attachments.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
          filename: file.name,
          content: buffer,
          contentType: file.type || undefined,
        };
      })
    );

    // Get sender user ID for tracking
    const senderUserId = currentUser?.id || null;

    // Create tracking records and send emails for each recipient
    const emailRecords: string[] = [];
    const trackingErrors: string[] = [];

    // Get base URL for tracking pixel
    let trackingBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!trackingBaseUrl) {
      const host = request.headers.get("host");
      const protocol = request.headers.get("x-forwarded-proto") || "https";
      trackingBaseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";
    }
    trackingBaseUrl = trackingBaseUrl.replace(/\/$/, "");

    // Send email to each recipient with tracking
    for (const recipientEmail of recipients) {
      try {
        // Create tracking record
        const emailRecord = await createEmailRecord({
          senderUserId,
          recipientEmail,
          subject,
        });
        emailRecords.push(emailRecord.tracking_id);

        // Get tracking ID - now using base64url format (email-safe, URL-safe, no = signs)
        let trackingId = emailRecord.tracking_id;
        
        // Remove any = signs if they exist (from old corrupted data)
        trackingId = trackingId.replace(/=/g, '');
        
        // Validate tracking ID format
        // New format: base64url (24 chars, no = padding)
        // Old format: hex (32 chars) - handle both for backward compatibility
        const isBase64url = /^[A-Za-z0-9_-]{24}$/.test(trackingId);
        const isHex = /^[a-f0-9]{32}$/i.test(trackingId);
        
        if (!isBase64url && !isHex) {
          console.error(`[Email Tracking] Invalid tracking ID format: ${trackingId} (length: ${trackingId.length})`);
          console.error(`[Email Tracking] Expected 24-char base64url or 32-char hex string`);
        }
        
        // Use tracking ID directly in URL - both formats are URL-safe
        // Base64url is email-safe (no = signs that trigger quoted-printable encoding)
        const trackingPixelUrl = `${trackingBaseUrl}/api/admin/email/track/${trackingId}`;
        console.log(`[Email Tracking] Using tracking ID: ${trackingId} (format: ${isBase64url ? 'base64url' : isHex ? 'hex' : 'unknown'})`);
        let htmlWithTracking = htmlContent.replace(
          "</body>",
          `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`
        );

        // Send email
        const mailOptions: nodemailer.SendMailOptions = {
          from: `"Vercatryx" <${process.env.ZOHO_EMAIL || "dh@vercatryx.com"}>`,
          to: recipientEmail,
          subject,
          html: htmlWithTracking,
          text: textContent,
        };
        
        console.log(`[Email Tracking] Tracking pixel URL: ${trackingPixelUrl}`);
        console.log(`[Email Tracking] Tracking ID: ${trackingId} (length: ${trackingId.length})`);

        if (replyTo) {
          mailOptions.replyTo = replyTo;
        }

        if (emailAttachments.length > 0) {
          mailOptions.attachments = emailAttachments;
        }

        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(`Error sending email to ${recipientEmail}:`, error);
        trackingErrors.push(
          `${recipientEmail}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    const attachmentInfo = attachments.length > 0 
      ? ` with ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}`
      : "";

    if (trackingErrors.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Email sent to ${recipients.length - trackingErrors.length} recipient(s)${attachmentInfo}. Some errors: ${trackingErrors.join("; ")}`,
        warnings: trackingErrors,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${recipients.join(", ")}${attachmentInfo}`,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

