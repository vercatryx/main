import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/permissions';
import { getPaymentRequestById, updatePaymentRequestStatus, getRequestDisplayInfo } from '@/lib/payments';
import nodemailer from 'nodemailer';

function initializePdfMake() {
  try {
    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    
    if (pdfFonts?.pdfMake?.vfs) {
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
    } else if (pdfFonts?.vfs) {
      pdfMake.vfs = pdfFonts.vfs;
    } else if (pdfFonts) {
      pdfMake.vfs = pdfFonts;
    }
    
    return pdfMake;
  } catch (error) {
    console.error('Error loading pdfMake fonts:', error);
    throw new Error('Failed to initialize PDF library');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const isSuperAdmin = clerkUser?.publicMetadata?.role === 'superuser';
    const dbUser = await getCurrentUser();

    if (!isSuperAdmin && !(dbUser && dbUser.role === 'admin')) {
      return NextResponse.json({ error: 'Only admins can send invoices' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Payment request ID is required' }, { status: 400 });
    }

    // Get payment request
    const paymentRequest = await getPaymentRequestById(id);
    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    const { name: recipientName, email: recipientEmail } = getRequestDisplayInfo(paymentRequest);
    const amount = paymentRequest.amount;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 400 });
    }

    const invoiceNumber = `INV-${paymentRequest.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const invoiceDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/logo-big.svg" alt="Vercatryx Logo" />
            <h1>Invoice</h1>
          </div>

          <div class="company-info">
            <h2>Vercatryx</h2>
            <p>Email: info@vercatryx.com</p>
            <p>Phone: (347) 215-0400</p>
          </div>

          <div style="display: flex; justify-content: space-between; margin: 20px 0;">
            <div>
              <p><strong>Bill To:</strong></p>
              <p>${recipientName}</p>
              <p>${recipientEmail}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
              <p><strong>Date:</strong> ${invoiceDate}</p>
              <p><strong>Status:</strong> ${paymentRequest.status}</p>
            </div>
          </div>

          <div class="breakdown">
            <h3>Payment Breakdown</h3>
            <table>
              <tr>
                <th>Service Amount</th>
                <td>$${amount.toFixed(2)}</td>
              </tr>
              <tr class="total">
                <th>Total Due</th>
                <td>$${amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Please complete your payment to settle this invoice.</p>
            <p>If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.</p>
            <p style="margin-top: 20px;"><strong>Payment Link:</strong> <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments?public_token=${paymentRequest.public_token}">Click here to pay</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Vercatryx Invoice

Bill To: ${recipientName}
Email: ${recipientEmail}

Invoice #: ${invoiceNumber}
Date: ${invoiceDate}
Status: ${paymentRequest.status}

Payment Breakdown:
Service Amount: $${amount.toFixed(2)}
Total Due: $${amount.toFixed(2)}

Please complete your payment to settle this invoice.

If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.

Payment Link: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments?public_token=${paymentRequest.public_token}
    `;

    // Generate PDF using pdfmake
    const docDefinition = {
      content: [
        { text: 'Vercatryx', style: 'header', alignment: 'center' },
        { text: 'info@vercatryx.com | (347) 215-0400', style: 'subheader', alignment: 'center' },
        { text: 'INVOICE', style: 'title', alignment: 'center', margin: [0, 20, 0, 20] },
        {
          columns: [
            {
              stack: [
                { text: 'Bill To:', bold: true, margin: [0, 0, 0, 5] },
                { text: recipientName },
                { text: recipientEmail }
              ]
            },
            {
              stack: [
                { text: 'Invoice Details:', bold: true, alignment: 'right', margin: [0, 0, 0, 5] },
                { text: `Invoice #: ${invoiceNumber}`, alignment: 'right' },
                { text: `Date: ${invoiceDate}`, alignment: 'right' },
                { text: `Status: ${paymentRequest.status}`, alignment: 'right' }
              ],
              alignment: 'right'
            }
          ],
          margin: [0, 20, 0, 20]
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Payment Breakdown', colSpan: 2, bold: true, fillColor: '#f9f9f9' }, {}],
              ['Service Amount', { text: `$${amount.toFixed(2)}`, alignment: 'right' }],
              [{ text: 'Total Due', bold: true, fillColor: '#f0f0f0' }, { text: `$${amount.toFixed(2)}`, bold: true, alignment: 'right', fillColor: '#f0f0f0' }]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        {
          text: [
            'Please complete your payment to settle this invoice.',
            '\nIf you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.'
          ],
          style: 'footer',
          alignment: 'center',
          margin: [0, 40, 0, 0]
        },
        {
          text: `Payment Link: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments?public_token=${paymentRequest.public_token}`,
          style: 'link',
          alignment: 'center',
          margin: [0, 20, 0, 0],
          link: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments?public_token=${paymentRequest.public_token}`
        }
      ],
      styles: {
        header: { fontSize: 24, bold: true, color: '#e44848', margin: [0, 0, 0, 10] },
        subheader: { fontSize: 10, color: '#666' },
        title: { fontSize: 18, bold: true },
        footer: { fontSize: 10, color: '#666', italics: true },
        link: { fontSize: 10, color: '#0066cc', decoration: 'underline' }
      },
      defaultStyle: { fontSize: 12 }
    };

    const pdfMake = initializePdfMake();
    const pdfDoc = pdfMake.createPdf(docDefinition);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(Buffer.from(buffer));
      });
    });

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
      to: recipientEmail,
      subject: `Invoice for Your Payment - ${invoiceNumber} (PDF Attached)`,
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Update status to 'invoiced' if it's still pending
    if (paymentRequest.status === 'pending') {
      try {
        await updatePaymentRequestStatus(paymentRequest.public_token, 'invoiced');
      } catch (updateError) {
        console.error('Failed to update payment request status:', updateError);
        // Don't fail the whole operation, just log
      }
    }

    return NextResponse.json({ success: true, invoiceNumber });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

