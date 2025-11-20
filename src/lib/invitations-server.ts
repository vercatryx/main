/**
 * Server-side invitation system
 * Sends invitation emails to new users
 * This file should ONLY be imported in server components or API routes
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { generateInvitationToken } from './invitations';

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
    projectName?: string;
}

/**
 * Send invitation email to a new user
 */
export async function sendInvitationEmail(params: SendInvitationParams): Promise<boolean> {
    const { email, firstName, lastName, companyName, companyId, inviterName, projectName } = params;

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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #e6e6e6; background:#0f0f0f; margin:0; padding:0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background:#111; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .header img { width: 90px; margin-bottom: 18px; }
    .header h1 { margin: 0; font-size: 26px; color: #fff; font-weight: 700; letter-spacing: 1px; }
    .content { background: #1a1a1a; padding: 30px; border-radius: 0 0 12px 12px; color:#dcdcdc; }
    .button { display: inline-block; padding: 12px 30px; background: #e44848; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0 10px 0; font-weight: bold; }
    .raw-link { font-size: 14px; color:#bbb; word-break: break-all; text-align:center; margin-top:6px; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${baseUrl}/logo-small-white.svg" alt="Vercatryx Logo" />
      <h1>Welcome to Vercatryx</h1>
    </div>

    <div class="content">
      <p>Hi ${userName},</p>

      <p>${inviterName ? `${inviterName} has` : 'You have been'} invited you to collaborate ${projectName ? `on the project <strong>${projectName}</strong> ` : ''}with <strong>${companyName}</strong>.</p>

      <p>To begin, please create your account using the button below:</p>

      <div style="text-align: center;">
        <a href="${signupUrl}" class="button">Create Account</a>
        <div class="raw-link">${signupUrl}</div>
      </div>

      <p>Once you sign up with <strong>${email}</strong>, you'll gain access to your project environment, files, and collaboration tools.</p>

      <p>If you have any questions, feel free to contact your administrator.</p>

      <p>Best regards,<br>Vercatryx Team</p>
    </div>

    <div class="footer">
      <p>This invitation was sent to ${email}</p>
      <p>If you didn’t expect this email, feel free to ignore it.</p>
    </div>
  </div>
</body>
</html>
`;

    const textBody = `
Hi ${userName},

${inviterName ? `${inviterName} has` : 'You have been'} invited you to collaborate ${projectName ? `on the project "${projectName}" ` : ''}with ${companyName} on Vercatryx.

Create your account: ${signupUrl}

Once you sign up with the email ${email}, you'll gain access to your project workspace and collaboration tools.

If you have any questions, feel free to reach out to your administrator.

Best regards,
Vercatryx Team

---
This invitation was sent to ${email}
If you didn't expect this email, you can safely ignore it.
`;

    try {
        // Use SES to send email
        const command = new SendEmailCommand({
            Source: 'dh@vercatryx.com',
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
        console.error('Error sending invitation email via SES:', error);

        // Fallback: Try using Zoho Mail SMTP
        try {
            const nodemailer = await import('nodemailer');

            const transporter = nodemailer.default.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: 'dh@vercatryx.com',
                    pass: process.env.ZOHO_APP_PASSWORD,
                },
            });

            await transporter.sendMail({
                from: '"Vercatryx" <dh@vercatryx.com>',
                to: email,
                subject,
                html: htmlBody,
                text: textBody,
            });

            return true;
        } catch (fallbackError) {
            console.error('Error sending invitation email via Zoho fallback:', fallbackError);
            return false;
        }
    }
}
