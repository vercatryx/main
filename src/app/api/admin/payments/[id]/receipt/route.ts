import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/permissions';
import { getPaymentRequestById, getRequestDisplayInfo } from '@/lib/payments';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Log that module is loaded
console.log('[RECEIPT ROUTE] Module loaded at:', new Date().toISOString());

// Explicitly export route config to ensure POST is recognized
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get receipt details for a payment request
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const isSuperAdmin = clerkUser?.publicMetadata?.role === 'superuser';
    const dbUser = await getCurrentUser();

    if (!isSuperAdmin && !(dbUser && dbUser.role === 'admin')) {
      return NextResponse.json({ error: 'Only admins can view receipts' }, { status: 403 });
    }

    const { id } = await context.params;
    const paymentRequest = await getPaymentRequestById(id);

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    // Get paymentIntentId from query params if provided (for interval billing)
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    // For interval billing, check if the specific billing is completed instead of payment request status
    // For other payment types, check payment request status
    if (paymentIntentId) {
      // For interval billing with specific paymentIntentId, verify the payment intent exists and succeeded
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
          return NextResponse.json({ error: 'Billing not completed' }, { status: 400 });
        }
        // Verify it matches this payment request
        if (paymentIntent.metadata?.public_token !== paymentRequest.public_token) {
          return NextResponse.json({ error: 'Payment intent does not match payment request' }, { status: 400 });
        }
      } catch (err) {
        console.error('Error fetching payment intent:', err);
        return NextResponse.json({ error: 'Billing not found or not completed' }, { status: 400 });
      }
    } else {
      // For non-interval billing, check payment request status
    if (paymentRequest.status !== 'completed') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
      }
    }

    const { name: recipientName, email: recipientEmail } = getRequestDisplayInfo(paymentRequest);

    // Try to get payment intent details from Stripe if we have a customer
    let receiptDetails: any = {
      invoiceNumber: paymentRequest.invoice_number,
      amount: paymentRequest.amount,
      fee: 0,
      total: paymentRequest.amount,
      paymentMethod: 'unknown',
      date: paymentRequest.updated_at || paymentRequest.created_at,
    };

    // If we have a specific paymentIntentId, use that; otherwise try to find matching payment intent
    if (paymentIntentId && paymentRequest.stripe_customer_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          const originalAmount = parseFloat(paymentIntent.metadata?.originalAmount || '0');
          const fee = parseFloat(paymentIntent.metadata?.fee || '0');
          const total = paymentIntent.amount / 100;
          const method = paymentIntent.metadata?.method || 'card';

          receiptDetails = {
            invoiceNumber: paymentIntent.metadata?.invoice_number ? parseInt(paymentIntent.metadata.invoice_number) : paymentRequest.invoice_number,
            amount: originalAmount || total,
            fee: fee,
            total: total,
            paymentMethod: method,
            date: new Date(paymentIntent.created * 1000).toISOString(),
            paymentIntentId: paymentIntent.id,
          };
        }
      } catch (err) {
        console.error('Error fetching payment intent details:', err);
        // Continue with basic details
      }
    } else if (paymentRequest.stripe_customer_id) {
      // If no specific paymentIntentId, try to find the most recent payment intent
      try {
        const paymentIntents = await stripe.paymentIntents.list({
          customer: paymentRequest.stripe_customer_id,
          limit: 10,
        });

        // Find payment intent that matches this payment request (by metadata or most recent)
        const matchingIntent = paymentIntents.data.find(
          (pi) => pi.metadata?.public_token === paymentRequest.public_token && pi.status === 'succeeded'
        ) || paymentIntents.data.find((pi) => pi.status === 'succeeded');

        if (matchingIntent && matchingIntent.status === 'succeeded') {
          const originalAmount = parseFloat(matchingIntent.metadata?.originalAmount || '0');
          const fee = parseFloat(matchingIntent.metadata?.fee || '0');
          const total = matchingIntent.amount / 100;
          const method = matchingIntent.metadata?.method || 'card';

          receiptDetails = {
            invoiceNumber: matchingIntent.metadata?.invoice_number ? parseInt(matchingIntent.metadata.invoice_number) : paymentRequest.invoice_number,
            amount: originalAmount || paymentRequest.amount,
            fee: fee,
            total: total,
            paymentMethod: method,
            date: new Date(matchingIntent.created * 1000).toISOString(),
            paymentIntentId: matchingIntent.id,
          };
        }
      } catch (err) {
        console.error('Error fetching payment intent details:', err);
        // Continue with basic details
      }
    }

    return NextResponse.json({
      receipt: {
        ...receiptDetails,
        recipientName,
        recipientEmail,
        publicToken: paymentRequest.public_token,
        paymentType: paymentRequest.payment_type,
      },
    });
  } catch (error: any) {
    console.error('Error fetching receipt details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt details', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Send receipt email to recipient
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('[RECEIPT ROUTE POST] Handler called - START');
  console.log('[RECEIPT ROUTE POST] Request method:', request.method);
  console.log('[RECEIPT ROUTE POST] Request URL:', request.url);
  
  try {
    // TEMPORARY TEST: Uncomment to test if handler returns properly
    // return NextResponse.json({ test: 'POST handler works', timestamp: Date.now() }, { status: 200 });
    
    // Authentication and authorization
    const { userId } = await auth();
    if (!userId) {
      console.log('[RECEIPT ROUTE POST] No userId, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const isSuperAdmin = clerkUser?.publicMetadata?.role === 'superuser';
    const dbUser = await getCurrentUser();

    if (!isSuperAdmin && !(dbUser && dbUser.role === 'admin')) {
      console.log('[RECEIPT ROUTE POST] Not admin, returning 403');
      return NextResponse.json({ error: 'Only admins can send receipts' }, { status: 403 });
    }

    const { id } = await context.params;
    console.log('[RECEIPT ROUTE POST] Payment request ID:', id);
    
    let paymentRequest;
    try {
      paymentRequest = await getPaymentRequestById(id);
      console.log('[RECEIPT ROUTE POST] Payment request found:', !!paymentRequest);
    } catch (err) {
      console.error('[RECEIPT ROUTE POST] Error fetching payment request:', err);
      return NextResponse.json({ error: 'Error fetching payment request', details: String(err) }, { status: 500 });
    }

    if (!paymentRequest) {
      console.log('[RECEIPT ROUTE POST] Payment request not found, returning 404');
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    // Get paymentIntentId from query params if provided (for interval billing)
    console.log('[RECEIPT ROUTE POST] About to parse URL:', request.url);
    let paymentIntentIdParam;
    try {
      const { searchParams } = new URL(request.url);
      paymentIntentIdParam = searchParams.get('paymentIntentId');
      console.log('[RECEIPT ROUTE POST] PaymentIntentId from query:', paymentIntentIdParam);
    } catch (err) {
      console.error('[RECEIPT ROUTE POST] Error parsing URL:', err);
      return NextResponse.json({ error: 'Invalid URL', details: String(err) }, { status: 400 });
    }

    // For interval billing, check if the specific billing is completed instead of payment request status
    // For other payment types, check payment request status
    console.log('[RECEIPT ROUTE POST] Checking payment status...');
    if (paymentIntentIdParam) {
      console.log('[RECEIPT ROUTE POST] Validating payment intent:', paymentIntentIdParam);
      // For interval billing with specific paymentIntentId, verify the payment intent exists and succeeded
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentIdParam);
        console.log('[RECEIPT ROUTE POST] Payment intent status:', paymentIntent.status);
        if (paymentIntent.status !== 'succeeded') {
          console.log('[RECEIPT ROUTE POST] Payment intent not succeeded, returning 400');
          return NextResponse.json({ error: 'Billing not completed' }, { status: 400 });
        }
        // Verify it matches this payment request
        if (paymentIntent.metadata?.public_token !== paymentRequest.public_token) {
          console.log('[RECEIPT ROUTE POST] Payment intent does not match, returning 400');
          return NextResponse.json({ error: 'Payment intent does not match payment request' }, { status: 400 });
        }
        console.log('[RECEIPT ROUTE POST] Payment intent validated successfully');
      } catch (err) {
        console.error('[RECEIPT ROUTE POST] Error fetching payment intent:', err);
        return NextResponse.json({ error: 'Billing not found or not completed' }, { status: 400 });
      }
    } else {
      // For non-interval billing, check payment request status
      console.log('[RECEIPT ROUTE POST] Checking payment request status:', paymentRequest.status);
    if (paymentRequest.status !== 'completed') {
        console.log('[RECEIPT ROUTE POST] Payment request not completed, returning 400');
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
      }
      console.log('[RECEIPT ROUTE POST] Payment request status validated');
    }

    const { name: recipientName, email: recipientEmail } = getRequestDisplayInfo(paymentRequest);

    // Get payment intent details
    let amount = paymentRequest.amount;
    let fee = 0;
    let total = paymentRequest.amount;
    let paymentMethod = 'card';
    let paymentIntentId: string | undefined;
    let invoiceNumber = paymentRequest.invoice_number;

    // If we have a specific paymentIntentId, use that; otherwise try to find matching payment intent
    if (paymentIntentIdParam && paymentRequest.stripe_customer_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentIdParam);
        
        if (paymentIntent.status === 'succeeded') {
          amount = parseFloat(paymentIntent.metadata?.originalAmount || paymentRequest.amount.toString());
          fee = parseFloat(paymentIntent.metadata?.fee || '0');
          total = paymentIntent.amount / 100;
          paymentMethod = paymentIntent.metadata?.method || 'card';
          paymentIntentId = paymentIntent.id;
          invoiceNumber = paymentIntent.metadata?.invoice_number ? parseInt(paymentIntent.metadata.invoice_number) : paymentRequest.invoice_number;
        }
      } catch (err) {
        console.error('Error fetching payment intent:', err);
      }
    } else if (paymentRequest.stripe_customer_id) {
      try {
        const paymentIntents = await stripe.paymentIntents.list({
          customer: paymentRequest.stripe_customer_id,
          limit: 10,
        });

        const matchingIntent = paymentIntents.data.find(
          (pi) => pi.metadata?.public_token === paymentRequest.public_token && pi.status === 'succeeded'
        ) || paymentIntents.data.find((pi) => pi.status === 'succeeded');

        if (matchingIntent) {
          amount = parseFloat(matchingIntent.metadata?.originalAmount || paymentRequest.amount.toString());
          fee = parseFloat(matchingIntent.metadata?.fee || '0');
          total = matchingIntent.amount / 100;
          paymentMethod = matchingIntent.metadata?.method || 'card';
          paymentIntentId = matchingIntent.id;
          invoiceNumber = matchingIntent.metadata?.invoice_number ? parseInt(matchingIntent.metadata.invoice_number) : paymentRequest.invoice_number;
        }
      } catch (err) {
        console.error('Error fetching payment intent:', err);
      }
    }

    // Send receipt email directly instead of using fetch
    console.log('[RECEIPT ROUTE POST] Preparing to send receipt email directly...');
    const nodemailer = await import('nodemailer');
    
    // Generate PDF receipt
    console.log('[RECEIPT ROUTE POST] Generating PDF receipt...');
    
    // Load logo image and convert to base64 for pdfmake
    let logoImage: string | undefined;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-big.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoImage = logoBuffer.toString('base64');
        console.log('[RECEIPT ROUTE POST] Logo loaded successfully, size:', logoBuffer.length, 'bytes');
      } else {
        console.warn('[RECEIPT ROUTE POST] Logo file not found at:', logoPath);
      }
    } catch (err) {
      console.error('[RECEIPT ROUTE POST] Error loading logo:', err);
    }
    
    // Initialize pdfmake with fonts (same approach as invoice route)
    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    
    if (pdfFonts?.pdfMake?.vfs) {
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
    } else if (pdfFonts?.vfs) {
      pdfMake.vfs = pdfFonts.vfs;
    } else if (pdfFonts) {
      pdfMake.vfs = pdfFonts;
    }
    
    // Add logo to vfs if available
    if (logoImage) {
      pdfMake.vfs = pdfMake.vfs || {};
      pdfMake.vfs['logo.png'] = logoImage;
      console.log('[RECEIPT ROUTE POST] Logo added to pdfmake vfs');
    }
    
    // Prepare receipt display variables (must be before PDF definition)
    // Use invoice number if provided, otherwise generate a receipt number
    const invoiceNum = invoiceNumber || (paymentIntentId ? `REC-${paymentIntentId.slice(-12).toUpperCase()}` : `REC-${Date.now().toString().slice(-10)}`);
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
    
    const pdfDocDefinition: any = {
      content: [
        // Header with Logo
        ...(logoImage ? [{
          image: 'logo.png', // Reference from vfs (converted from SVG)
          width: 150,
          alignment: 'center',
          margin: [0, 0, 0, 20],
          fit: [150, 75] // Maintain aspect ratio
        }] : [{
          text: 'VERCATRYX',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        }]),
        {
          text: 'PAYMENT RECEIPT',
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },
        {
          text: '✓ Payment Successful',
          style: 'successBadge',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },
        
        // Company Info
        {
          columns: [
            {
              text: [
                { text: 'Vercatryx\n', bold: true },
                { text: 'Email: info@vercatryx.com\n' },
                { text: 'Phone: (347) 215-0400' }
              ],
              width: '*'
            },
            {
              text: [
                { text: `Invoice #: ${invoiceNum}\n`, bold: true },
                { text: `Date: ${receiptDate}\n` },
                { text: `Payment Method: ${methodDisplay}` }
              ],
              alignment: 'right',
              width: '*'
            }
          ],
          margin: [0, 0, 0, 20]
        },
        
        // Bill To
        {
          text: 'Bill To:',
          style: 'label',
          margin: [0, 20, 0, 5]
        },
        {
          text: [
            { text: `${recipientName}\n`, bold: true },
            { text: recipientEmail }
          ],
          margin: [0, 0, 0, 30]
        },
        
        // Payment Details Table
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'Service Amount', style: 'tableHeader' },
                { text: `$${amount.toFixed(2)}`, style: 'tableCell', alignment: 'right' }
              ],
              ...(fee > 0 ? [[
                { text: 'Processing Fee (3%)', style: 'tableHeader' },
                { text: `$${fee.toFixed(2)}`, style: 'tableCell', alignment: 'right' }
              ]] : []),
              [
                { text: 'Total Paid', style: 'tableTotal' },
                { text: `$${total.toFixed(2)}`, style: 'tableTotal', alignment: 'right' }
              ]
            ]
          },
          layout: {
            hLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? 1 : 0;
            },
            vLineWidth: () => 0,
            paddingLeft: () => 10,
            paddingRight: () => 10,
            paddingTop: () => 10,
            paddingBottom: () => 10,
          },
          margin: [0, 0, 0, 30]
        },
        
        // Footer
        {
          text: 'Thank you for your payment!',
          alignment: 'center',
          margin: [0, 20, 0, 10]
        },
        {
          text: `This is your receipt for the payment made on ${receiptDate}.`,
          alignment: 'center',
          fontSize: 9,
          color: '#666666',
          margin: [0, 0, 0, 10]
        },
        {
          text: 'If you have any questions, please contact us at info@vercatryx.com or (347) 215-0400.',
          alignment: 'center',
          fontSize: 9,
          color: '#666666'
        }
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#e44848'
        },
        subheader: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        successBadge: {
          fontSize: 12,
          bold: true,
          color: '#4CAF50'
        },
        label: {
          fontSize: 12,
          bold: true
        },
        tableHeader: {
          fontSize: 11,
          bold: true,
          color: '#333333'
        },
        tableCell: {
          fontSize: 11,
          color: '#333333'
        },
        tableTotal: {
          fontSize: 12,
          bold: true,
          color: '#333333'
        }
      },
      pageMargins: [40, 60, 40, 60]
    };
    
    const pdfDoc = pdfMake.createPdf(pdfDocDefinition);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(Buffer.from(buffer));
      });
    });
    
    console.log('[RECEIPT ROUTE POST] PDF generated, size:', pdfBuffer.length, 'bytes');
    
    // Generate HTML email body
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
            <img src="${baseUrl}/logo-big.svg" alt="Vercatryx Logo" />
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
              <p>${recipientName}</p>
              <p>${recipientEmail}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Invoice #:</strong> ${invoiceNum}</p>
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

Bill To: ${recipientName}
Email: ${recipientEmail}

Invoice #: ${invoiceNum}
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

    console.log('[RECEIPT ROUTE POST] Sending email to:', recipientEmail);
    await transporter.sendMail({
      from: '"Vercatryx" <info@vercatryx.com>',
      to: recipientEmail,
      subject: `Payment Receipt - Invoice #${invoiceNum}`,
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename: `Receipt_${invoiceNum}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('[RECEIPT ROUTE POST] Email sent successfully');
    return NextResponse.json({ success: true, invoiceNumber: invoiceNum });
  } catch (error: any) {
    console.error('[RECEIPT ROUTE POST] Error sending receipt:', error);
    console.error('[RECEIPT ROUTE POST] Error stack:', error?.stack);
    console.error('[RECEIPT ROUTE POST] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to send receipt', details: error?.message || String(error) },
      { status: 500 }
    );
  } finally {
    console.log('[RECEIPT ROUTE POST] Handler execution complete');
  }
}

