import { randomBytes } from 'crypto';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument } from 'pdf-lib';
import { getServerSupabaseClient } from './supabase';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './r2';

export interface PdfSignatureField {
  id: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string | null;
}

export interface PdfSignatureRequest {
  id: string;
  title: string;
  pdf_file_url: string;
  status: 'draft' | 'sent' | 'completed';
  public_token: string;
  created_at: string;
  updated_at: string;
  fields?: PdfSignatureField[];
}

export interface PdfSignatureRecord {
  id: string;
  request_id: string;
  signer_name: string | null;
  signer_email: string | null;
  signer_ip: string | null;
  signature_image_url: string | null;
  signed_pdf_url: string | null;
  signed_at: string;
}

export function generatePublicToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function getPdfKeyFromUrl(pdfUrl: string): string {
  try {
    const url = new URL(pdfUrl);
    return url.pathname.replace(/^\//, '');
  } catch {
    // If it's already a key or relative path, return as-is
    return pdfUrl.replace(/^\//, '');
  }
}

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

export async function getPdfSignatureRequestById(id: string): Promise<PdfSignatureRequest | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('pdf_signature_requests')
    .select(
      `
      *,
      fields:pdf_signature_fields(*)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching PDF signature request by id:', error);
    return null;
  }

  return data as PdfSignatureRequest | null;
}

export async function getSignaturesForRequest(
  requestId: string
): Promise<PdfSignatureRecord[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('pdf_signatures')
    .select('*')
    .eq('request_id', requestId)
    .order('signed_at', { ascending: false });

  if (error) {
    console.error('Error fetching signatures for request:', error);
    return [];
  }

  return (data || []) as PdfSignatureRecord[];
}

export async function getAllPdfSignatureRequests(): Promise<PdfSignatureRequest[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('pdf_signature_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all PDF signature requests:', error);
    return [];
  }

  return (data || []) as PdfSignatureRequest[];
}

export async function deletePdfSignatureRequest(id: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  // Load request to know which files to delete
  const request = await getPdfSignatureRequestById(id);
  if (!request) {
    return;
  }

  // Load all associated signatures to delete signed PDFs
  const signatures = await getSignaturesForRequest(id);

  // Collect all R2 keys to delete: original PDF + all signed PDFs
  const keysToDelete = new Set<string>();
  if (request.pdf_file_url) {
    keysToDelete.add(getPdfKeyFromUrl(request.pdf_file_url));
  }
  for (const sig of signatures) {
    if (sig.signed_pdf_url) {
      keysToDelete.add(getPdfKeyFromUrl(sig.signed_pdf_url));
    }
  }

  // Delete from R2 (best-effort)
  for (const key of keysToDelete) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      await r2Client.send(command);
    } catch (error) {
      console.error('Error deleting PDF from R2 for signature request:', key, error);
    }
  }

  // Delete from database; cascades remove fields and signatures
  const { error } = await supabase
    .from('pdf_signature_requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting PDF signature request from database:', error);
    throw new Error('Failed to delete PDF signature request');
  }
}

export async function createPdfSignatureRequest(params: {
  title: string;
  createdByClerkUserId: string;
  file: File;
}): Promise<PdfSignatureRequest> {
  const supabase = getServerSupabaseClient();

  const publicToken = generatePublicToken(16);
  const timestamp = Date.now();
  const sanitizedFilename = params.file.name.replace(/[^a-zA-Z0-9.-]/g, '_') || 'document.pdf';
  const fileKey = `pdf-signatures/${timestamp}-${sanitizedFilename}`;

  const fileBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  const putCommand = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: params.file.type || 'application/pdf',
    ContentLength: params.file.size,
    Metadata: {
      'original-filename': sanitizedFilename,
      'created-by-clerk-user-id': params.createdByClerkUserId,
    },
  });

  await r2Client.send(putCommand);

  const pdfUrl = `${R2_PUBLIC_URL}/${fileKey}`;

  const { data, error } = await supabase
    .from('pdf_signature_requests')
    .insert({
      title: params.title,
      created_by_clerk_user_id: params.createdByClerkUserId,
      pdf_file_url: pdfUrl,
      public_token: publicToken,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating PDF signature request:', error);
    throw new Error('Failed to create PDF signature request');
  }

  return data as PdfSignatureRequest;
}

export async function savePdfSignatureFields(params: {
  requestId: string;
  fields: Omit<PdfSignatureField, 'id'>[];
}): Promise<PdfSignatureField[]> {
  const supabase = getServerSupabaseClient();

  // Remove existing fields
  const { error: deleteError } = await supabase
    .from('pdf_signature_fields')
    .delete()
    .eq('request_id', params.requestId);

  if (deleteError) {
    console.error('Error deleting existing PDF signature fields:', deleteError);
    throw new Error('Failed to update PDF signature fields');
  }

  if (!params.fields.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('pdf_signature_fields')
    .insert(
      params.fields.map((field) => ({
        request_id: params.requestId,
        page_number: field.page_number,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        label: field.label,
      }))
    )
    .select();

  if (error) {
    console.error('Error saving PDF signature fields:', error);
    throw new Error('Failed to save PDF signature fields');
  }

  return data as PdfSignatureField[];
}

export async function getPdfSignatureRequestByToken(
  token: string
): Promise<PdfSignatureRequest | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('pdf_signature_requests')
    .select(
      `
      *,
      fields:pdf_signature_fields(*)
    `
    )
    .eq('public_token', token)
    .maybeSingle();

  if (error) {
    console.error('Error fetching PDF signature request by token:', error);
    return null;
  }

  return data as PdfSignatureRequest | null;
}

export async function markRequestAsSent(requestId: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from('pdf_signature_requests')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    console.error('Error marking request as sent:', error);
    throw new Error('Failed to update request status');
  }
}

export async function saveSignatureForRequest(params: {
  token: string;
  signerName?: string;
  signerEmail?: string;
  signerIp?: string;
  signatureImageDataUrl: string;
}): Promise<{ signedPdfUrl: string }> {
  const supabase = getServerSupabaseClient();

  const request = await getPdfSignatureRequestByToken(params.token);
  if (!request) {
    throw new Error('Request not found');
  }

  if (!request.fields || request.fields.length === 0) {
    throw new Error('No signature fields configured');
  }

  // Download original PDF from R2
  const originalUrl = new URL(request.pdf_file_url);
  const keyFromUrl = originalUrl.pathname.replace(/^\//, '');

  const getPdfCommand = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: keyFromUrl,
  });

  const pdfObject = await r2Client.send(getPdfCommand);
  if (!pdfObject.Body) {
    throw new Error('Failed to download original PDF');
  }

  const pdfBytes = await streamToBuffer(pdfObject.Body);

  // Decode signature image
  const match = params.signatureImageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid signature image data');
  }
  const imageBytes = Buffer.from(match[2], 'base64');

  // Manipulate PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pngImage = await pdfDoc.embedPng(imageBytes);

  const fields = request.fields;

  for (const field of fields) {
    const pageIndex = Math.max(0, Math.min(pdfDoc.getPageCount() - 1, field.page_number - 1));
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();

    const fieldWidth = field.width * width;
    const fieldHeight = field.height * height;
    const x = field.x * width;

    // Canvas (PDF.js) uses top-left origin for our click coordinates,
    // but PDF pages (pdf-lib) use bottom-left origin.
    // Convert from "top-left" percentages to PDF "bottom-left" coordinates:
    // y_top = field.y, height_pct = field.height
    // y_bottom = 1 - y_top - height_pct
    const yFromBottom = 1 - field.y - field.height;
    const y = yFromBottom * height;

    page.drawImage(pngImage, {
      x,
      y,
      width: fieldWidth,
      height: fieldHeight,
    });
  }

  const signedPdfBytes = await pdfDoc.save();

  const signedKey = `pdf-signatures/signed/${request.id}-${Date.now()}.pdf`;

  const putSigned = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: signedKey,
    Body: Buffer.from(signedPdfBytes),
    ContentType: 'application/pdf',
  });

  await r2Client.send(putSigned);

  const signedPdfUrl = `${R2_PUBLIC_URL}/${signedKey}`;

  // Store signature record
  const { error: insertError } = await supabase.from('pdf_signatures').insert({
    request_id: request.id,
    signer_name: params.signerName || null,
    signer_email: params.signerEmail || null,
    signer_ip: params.signerIp || null,
    signature_image_url: null,
    signed_pdf_url: signedPdfUrl,
  });

  if (insertError) {
    console.error('Error saving PDF signature record:', insertError);
  }

  // Mark request as completed
  const { error: updateError } = await supabase
    .from('pdf_signature_requests')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', request.id);

  if (updateError) {
    console.error('Error updating request status to completed:', updateError);
  }

  return { signedPdfUrl };
}


