import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { updatePaymentRequestStatus } from '@/lib/payments';
import fs from 'fs';
import path from 'path';

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
    const { name, email, originalAmount, fee, total, paymentIntentId, public_token } = await request.json();

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
          .breakdown { margin: 20px 0; }
          .breakdown table { width: 100%; border-collapse: collapse; }
          .breakdown th, .breakdown td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .breakdown th { background: #f9f9f9; }
          .total { font-weight: bold; font-size: 1.1em; }
          .pay-button { display: inline-block; padding: 20px 40px; background: #e44848; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 20px; font-weight: bold; margin: 30px 0; text-align: center; }
          a.pay-button { color: #ffffff !important; }
          a.pay-button:link { color: #ffffff !important; }
          a.pay-button:visited { color: #ffffff !important; }
          a.pay-button:hover { color: #ffffff !important; background: #c93a3a; }
          a.pay-button:active { color: #ffffff !important; }
          .button-container { text-align: center; margin: 30px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/logo-big.svg" alt="Vercatryx Logo" />
            <h1>Invoice</h1>
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
            </div>
          </div>

          <div class="breakdown">
            <h3>Payment Details</h3>
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

          ${public_token ? `
          <div class="button-container">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments?public_token=${public_token}" class="pay-button">Pay Now - $${effectiveTotal.toFixed(2)}</a>
          </div>
          ` : `
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
            <p style="font-size: 18px; font-weight: bold; margin: 0;">Please complete your payment via ${displayMethod.toLowerCase()} to settle this invoice.</p>
          </div>
          `}

          <div class="footer">
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

Payment Details:
Service Amount: $${originalAmount.toFixed(2)}
${effectiveFee > 0 ? `Processing Fee (3%): $${effectiveFee.toFixed(2)}` : ''}
Total Due: $${effectiveTotal.toFixed(2)}

${public_token ? `PAY NOW: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments?public_token=${public_token}` : `Please complete your payment via ${displayMethod.toLowerCase()} to settle this invoice.`}

If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.
    `;

    // Load logo image and convert to base64 for pdfmake
    // pdfmake accepts base64 strings directly (without data URI prefix)
    let logoImage: string | undefined;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-big.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoImage = logoBuffer.toString('base64');
        console.log('[SEND INVOICE] Logo loaded successfully, size:', logoBuffer.length, 'bytes');
      } else {
        console.warn('[SEND INVOICE] Logo file not found at:', logoPath);
      }
    } catch (err) {
      console.error('[SEND INVOICE] Error loading logo:', err);
    }

    // Generate PDF using pdfmake
    const docDefinition: any = {
      content: [
        // Header with Logo
        ...(logoImage ? [{
          image: 'logo.png', // Reference from vfs
          width: 150,
          alignment: 'center',
          margin: [0, 0, 0, 10],
          fit: [150, 75] // Maintain aspect ratio
        }] : [{
          text: 'Vercatryx',
          style: 'header',
          alignment: 'center'
        }]),
        { text: 'info@vercatryx.com | (347) 215-0400', style: 'subheader', alignment: 'center' },
        { text: 'INVOICE', style: 'title', alignment: 'center', margin: [0, 20, 0, 20] },
        {
          columns: [
            {
              stack: [
                { text: 'Bill To:', bold: true },
                { text: name },
                { text: email }
              ]
            },
            {
              stack: [
                { text: 'Invoice Details:', bold: true, alignment: 'right' },
                { text: `Invoice #: ${invoiceNumber}`, alignment: 'right' },
                { text: `Date: ${invoiceDate}`, alignment: 'right' },
                { text: `Payment Method: ${displayMethod}`, alignment: 'right' },
                !isDummy && { text: `Payment ID: ${paymentIntentId}`, alignment: 'right' }
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
              [{ text: 'Payment Breakdown', colSpan: 2, bold: true }, {}],
              ['Service Amount', `$${originalAmount.toFixed(2)}`],
              ...(effectiveFee > 0 ? [['Processing Fee (3%)', `$${effectiveFee.toFixed(2)}`]] : []),
              [{ text: 'Total Due', bold: true }, { text: `$${effectiveTotal.toFixed(2)}`, bold: true, alignment: 'right' }]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        {
          text: [
            `Please complete your payment via ${displayMethod.toLowerCase()} to settle this invoice.`,
            '\nIf you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.'
          ],
          style: 'footer',
          alignment: 'center',
          margin: [0, 40, 0, 0]
        }
      ],
      styles: {
        header: { fontSize: 24, bold: true, color: '#e44848', margin: [0, 0, 0, 10] },
        subheader: { fontSize: 10, color: '#666' },
        title: { fontSize: 18, bold: true },
        footer: { fontSize: 10, color: '#666', italics: true }
      },
      defaultStyle: { fontSize: 12 }
    };

    const pdfMake = initializePdfMake();
    
    // Add logo to vfs if available
    if (logoImage) {
      pdfMake.vfs = pdfMake.vfs || {};
      pdfMake.vfs['logo.png'] = logoImage;
      console.log('[SEND INVOICE] Logo added to pdfmake vfs');
    }
    
    const pdfDoc = pdfMake.createPdf(docDefinition);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
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

    // If public_token provided, update status to 'invoiced'
    if (public_token) {
      try {
        await updatePaymentRequestStatus(public_token, 'invoiced');
      } catch (updateError) {
        console.error('Failed to update payment request status:', updateError);
        // Don't fail the whole operation, just log
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 });
  }
}
