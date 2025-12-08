import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getPaymentRequestByToken, getRequestDisplayInfo } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      public_token, 
      paymentIntentId, 
      amount, 
      fee, 
      total, 
      paymentMethod,
      recipientEmail,
      recipientName 
    } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    // Get payment request if public_token is provided
    let paymentRequest = null;
    let displayName = recipientName;
    let displayEmail = recipientEmail;

    if (public_token) {
      try {
        paymentRequest = await getPaymentRequestByToken(public_token);
        if (paymentRequest) {
          const info = getRequestDisplayInfo(paymentRequest);
          displayName = info.name;
          displayEmail = info.email || recipientEmail;
        }
      } catch (err) {
        console.error('Error fetching payment request:', err);
        // Continue with provided email/name
      }
    }

    const receiptNumber = paymentIntentId ? `REC-${paymentIntentId.slice(-12).toUpperCase()}` : `REC-${Date.now().toString().slice(-10)}`;
    const receiptDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const methodDisplay = paymentMethod === 'ach' ? 'ACH Bank Transfer' : 
                         paymentMethod === 'card' ? 'Credit/Debit Card' : 
                         paymentMethod || 'Payment';

    // Generate HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #e44848; }
          .header img { width: 150px; margin-bottom: 10px; }
          .company-info { margin: 20px 0; }
          .breakdown { margin: 20px 0; }
          .breakdown table { width: 100%; border-collapse: collapse; }
          .breakdown th, .breakdown td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .breakdown th { background: #f9f9f9; }
          .total { font-weight: bold; font-size: 1.1em; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
          .success-badge { background: #4CAF50; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/logo-big.svg" alt="Vercatryx Logo" />
            <h1>Payment Receipt</h1>
            <div class="success-badge">✓ Payment Successful</div>
          </div>

          <div class="company-info">
            <h2>Vercatryx</h2>
            <p>Email: info@vercatryx.com</p>
            <p>Phone: (347) 215-0400</p>
          </div>

          <div style="display: flex; justify-content: space-between; margin: 20px 0;">
            <div>
              <p><strong>Bill To:</strong></p>
              <p>${displayName}</p>
              <p>${displayEmail}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Receipt #:</strong> ${receiptNumber}</p>
              <p><strong>Date:</strong> ${receiptDate}</p>
              <p><strong>Payment Method:</strong> ${methodDisplay}</p>
            </div>
          </div>

          <div class="breakdown">
            <h3>Payment Details</h3>
            <table>
              <tr>
                <th>Service Amount</th>
                <td>$${amount.toFixed(2)}</td>
              </tr>
              ${fee > 0 ? `
              <tr>
                <th>Processing Fee (3%)</th>
                <td>$${fee.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr class="total">
                <th>Total Paid</th>
                <td>$${total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>This is your receipt for the payment made on ${receiptDate}.</p>
            <p>If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Vercatryx Payment Receipt

Bill To: ${displayName}
Email: ${displayEmail}

Receipt #: ${receiptNumber}
Date: ${receiptDate}
Payment Method: ${methodDisplay}

Payment Details:
Service Amount: $${amount.toFixed(2)}
${fee > 0 ? `Processing Fee (3%): $${fee.toFixed(2)}\n` : ''}Total Paid: $${total.toFixed(2)}

Thank you for your payment!

This is your receipt for the payment made on ${receiptDate}.

If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.
    `;

    // Create transporter using Zoho SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false,
      auth: {
        user: 'info@vercatryx.com',
        pass: process.env.ZOHO_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: '"Vercatryx" <info@vercatryx.com>',
      to: displayEmail,
      subject: `Payment Receipt - ${receiptNumber}`,
      html: htmlBody,
      text: textBody,
    });

    return NextResponse.json({ success: true, receiptNumber });
  } catch (error) {
    console.error('Error sending receipt:', error);
    return NextResponse.json(
      { error: 'Failed to send receipt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

