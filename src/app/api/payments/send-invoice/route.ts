import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export async function POST(request: NextRequest) {
  try {
    const { name, email, originalAmount, fee, total, paymentIntentId } = await request.json();

    if (!name || !email || originalAmount == null || fee == null || total == null ||
        isNaN(originalAmount) || isNaN(fee) || isNaN(total) ||
        originalAmount <= 0 || fee < 0 || total <= 0) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    const isDummy = paymentIntentId.startsWith('DUMMY');
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoiceDate = new Date().toLocaleDateString();
    // Infer method from paymentIntentId for dummy
    const dummyMethod = isDummy ? (paymentIntentId.includes('wire') ? 'Wire' : 'Zelle') : '';
    const displayMethod = isDummy ? `${dummyMethod} Transfer` : 'Credit Card';

    // For dummy, ensure fee=0, total=originalAmount
    const effectiveFee = isDummy ? 0 : fee;
    const effectiveTotal = isDummy ? originalAmount : total;

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
              <p>${name}</p>
              <p>${email}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
              <p><strong>Date:</strong> ${invoiceDate}</p>
              <p><strong>Payment Method:</strong> ${displayMethod}</p>
              ${!isDummy ? `<p><strong>Payment ID:</strong> ${paymentIntentId}</p>` : ''}
            </div>
          </div>

          <div class="breakdown">
            <h3>Payment Breakdown</h3>
            <table>
              <tr>
                <th>Service Amount</th>
                <td>$${originalAmount.toFixed(2)}</td>
              </tr>
              ${effectiveFee > 0 ? `<tr><th>Processing Fee (3%)</th><td>$${effectiveFee.toFixed(2)}</td></tr>` : ''}
              <tr class="total">
                <th>Total Due</th>
                <td>$${effectiveTotal.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Please complete your payment via ${displayMethod.toLowerCase()} to settle this invoice.</p>
            <p>If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Vercatryx Invoice

Bill To: ${name}
Email: ${email}

Invoice #: ${invoiceNumber}
Date: ${invoiceDate}
Payment Method: ${displayMethod}
${!isDummy ? `Payment ID: ${paymentIntentId}` : ''}

Payment Breakdown:
Service Amount: $${originalAmount.toFixed(2)}
${effectiveFee > 0 ? `Processing Fee (3%): $${effectiveFee.toFixed(2)}` : ''}
Total Due: $${effectiveTotal.toFixed(2)}

Please complete your payment via ${displayMethod.toLowerCase()} to settle this invoice.

If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.
    `;

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Vercatryx', 50, 50);
      doc.fontSize(12).text('info@vercatryx.com', 50, 80);
      doc.fontSize(12).text('(347) 215-0400', 50, 95);

      // Logo (text placeholder, as PDFKit doesn't embed SVG easily; use image if path available)
      doc.fontSize(16).text('INVOICE', 400, 50, { align: 'right' });

      // Bill To
      doc.fontSize(14).text('Bill To:', 50, 150);
      doc.fontSize(12).text(name, 50, 170);
      doc.fontSize(12).text(email, 50, 185);

      // Invoice Details
      doc.fontSize(14).text('Invoice Details:', 400, 150, { align: 'right' });
      doc.fontSize(12).text(`Invoice #: ${invoiceNumber}`, 400, 170, { align: 'right' });
      doc.fontSize(12).text(`Date: ${invoiceDate}`, 400, 185, { align: 'right' });
      doc.fontSize(12).text(`Payment Method: ${displayMethod}`, 400, 200, { align: 'right' });
      if (!isDummy) {
        doc.fontSize(12).text(`Payment ID: ${paymentIntentId}`, 400, 215, { align: 'right' });
      }

      // Breakdown
      let yPos = 250;
      doc.fontSize(14).text('Payment Breakdown', 50, yPos);
      yPos += 30;

      // Table headers
      doc.strokeColor('#999').lineWidth(1)
        .moveTo(50, yPos).lineTo(550, yPos).stroke(); // Top line
      doc.fontSize(12).text('Service Amount', 60, yPos + 5);
      doc.text(`$${originalAmount.toFixed(2)}`, 450, yPos + 5, { align: 'right' });
      yPos += 20;

      if (effectiveFee > 0) {
        doc.text('Processing Fee (3%)', 60, yPos + 5);
        doc.text(`$${effectiveFee.toFixed(2)}`, 450, yPos + 5, { align: 'right' });
        yPos += 20;
      }

      // Total line
      doc.strokeColor('#999').lineWidth(1)
        .moveTo(50, yPos).lineTo(550, yPos).stroke(); // Bottom line
      doc.fontSize(14).fillColor('#000').text('Total Due', 60, yPos + 5);
      doc.text(`$${effectiveTotal.toFixed(2)}`, 450, yPos + 5, { align: 'right' });
      yPos += 30;

      // Footer
      doc.fillColor('#666').fontSize(10)
        .text(`Please complete your payment via ${displayMethod.toLowerCase()} to settle this invoice.`, 50, yPos);
      yPos += 20;
      doc.text('If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.', 50, yPos);

      doc.end();
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
      to: email,
      subject: `Invoice for Your Payment - ${invoiceNumber} (PDF Attached)`,
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename: 'invoice.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 });
  }
}
