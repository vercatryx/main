/**
 * User invitation system
 * Sends invitation emails to new users
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface SendInvitationParams {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName: string;
  companyId: string;
  inviterName?: string;
}

/**
 * Generate an invitation token (you can use JWT or a simple UUID)
 */
export function generateInvitationToken(email: string, companyId: string): string {
  // For now, use a simple base64 encoded JSON
  // In production, use a signed JWT with expiration
  const payload = {
    email,
    companyId,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify an invitation token
 */
export function verifyInvitationToken(token: string): { email: string; companyId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.expires < Date.now()) {
      return null; // Token expired
    }
    return { email: payload.email, companyId: payload.companyId };
  } catch {
    return null;
  }
}

/**
 * Send invitation email to a new user
 */
export async function sendInvitationEmail(params: SendInvitationParams): Promise<boolean> {
  const { email, firstName, lastName, companyName, companyId, inviterName } = params;

  // Generate invitation token
  const token = generateInvitationToken(email, companyId);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const signupUrl = `${baseUrl}/sign-up?invitation=${token}`;

  const userName = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || lastName || email.split('@')[0];

  const subject = `You've been invited to join ${companyName}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${companyName}!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>

          <p>${inviterName ? `${inviterName} has` : 'You have been'} invited you to join <strong>${companyName}</strong> on our platform.</p>

          <p>To get started, please create your account by clicking the button below:</p>

          <div style="text-align: center;">
            <a href="${signupUrl}" class="button">Create Account</a>
          </div>

          <p>Once you sign up with the email <strong>${email}</strong>, you'll have access to your company's projects, meetings, and more.</p>

          <p>If you have any questions, feel free to reach out to your administrator.</p>

          <p>Best regards,<br>The Team</p>
        </div>
        <div class="footer">
          <p>This invitation was sent to ${email}</p>
          <p>If you didn't expect this email, you can safely ignore it.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
Hi ${userName},

${inviterName ? `${inviterName} has` : 'You have been'} invited you to join ${companyName} on our platform.

To get started, please create your account by visiting: ${signupUrl}

Once you sign up with the email ${email}, you'll have access to your company's projects, meetings, and more.

If you have any questions, feel free to reach out to your administrator.

Best regards,
The Team

---
This invitation was sent to ${email}
If you didn't expect this email, you can safely ignore it.
  `;

  try {
    // Use SES to send email
    const command = new SendEmailCommand({
      Source: process.env.EMAIL_USER || 'noreply@vercatryx.com',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Html: {
            Data: htmlBody,
          },
          Text: {
            Data: textBody,
          },
        },
      },
    });

    await ses.send(command);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);

    // Fallback: Try using the existing Gmail setup
    try {
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html: htmlBody,
        text: textBody,
      });

      return true;
    } catch (fallbackError) {
      console.error('Error sending invitation email via Gmail fallback:', fallbackError);
      return false;
    }
  }
}
