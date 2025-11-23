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
  field_type?: 'signature' | 'data_entry';
  signature_image_url?: string | null;
}

export interface PdfSignatureRequest {
  id: string;
  title: string;
  pdf_file_url: string;
  status: 'draft' | 'sent' | 'completed';
  public_token: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
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
        field_type: field.field_type || 'signature',
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

export async function submitPdfSignatureRequest(token: string): Promise<{ signedPdfUrl: string | null }> {
  const supabase = getServerSupabaseClient();

  const request = await getPdfSignatureRequestByToken(token);
  if (!request) {
    throw new Error('Request not found');
  }

  // Check if already submitted
  if (request.submitted_at) {
    throw new Error('Request has already been submitted');
  }

  const { error } = await supabase
    .from('pdf_signature_requests')
    .update({ 
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq('id', request.id);

  if (error) {
    console.error('Error submitting PDF signature request:', error);
    throw new Error('Failed to submit request');
  }

  // Get the latest signed PDF URL from the signatures table
  const signatures = await getSignaturesForRequest(request.id);
  const signedPdfUrl = signatures.length > 0 && signatures[0].signed_pdf_url 
    ? signatures[0].signed_pdf_url 
    : null;

  return { signedPdfUrl };
}

export async function saveSignatureForRequest(params: {
  token: string;
  signerName?: string;
  signerEmail?: string;
  signerIp?: string;
  fieldId: string;
  signatureImageDataUrl: string;
}): Promise<{ signedPdfUrl: string }> {
  const supabase = getServerSupabaseClient();

  const request = await getPdfSignatureRequestByToken(params.token);
  if (!request) {
    throw new Error('Request not found');
  }

  // Prevent saving signatures if the request has been submitted
  if (request.submitted_at) {
    throw new Error('This document has already been submitted and cannot be modified');
  }

  if (!request.fields || request.fields.length === 0) {
    throw new Error('No signature fields configured');
  }

  // Find the field being signed
  const targetField = request.fields.find((f) => f.id === params.fieldId);
  if (!targetField) {
    throw new Error('Field not found');
  }

  // Upload signature image to R2 and get URL
  const match = params.signatureImageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid signature image data');
  }
  const imageBytes = Buffer.from(match[2], 'base64');
  const imageKey = `pdf-signatures/signatures/${request.id}/${params.fieldId}-${Date.now()}.png`;
  
  const putImageCommand = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: imageKey,
    Body: imageBytes,
    ContentType: 'image/png',
  });

  await r2Client.send(putImageCommand);
  const signatureImageUrl = `${R2_PUBLIC_URL}/${imageKey}`;

  // Update the field with the signature image URL
  const { error: fieldUpdateError } = await supabase
    .from('pdf_signature_fields')
    .update({ signature_image_url: signatureImageUrl })
    .eq('id', params.fieldId)
    .eq('request_id', request.id);

  if (fieldUpdateError) {
    console.error('Error updating field signature:', fieldUpdateError);
    throw new Error('Failed to save field signature');
  }

  // Reload fields to get all signatures
  const updatedRequest = await getPdfSignatureRequestByToken(params.token);
  if (!updatedRequest || !updatedRequest.fields) {
    throw new Error('Failed to reload request');
  }

  // Check if all fields are completed (both signature fields and data_entry fields)
  // Both field types store their data in signature_image_url, so we check all fields
  const allFieldsSigned = updatedRequest.fields.length > 0 && updatedRequest.fields.every(
    (field) => field.signature_image_url !== null && field.signature_image_url !== undefined
  );

  // Get existing signatures to check if we need to update or create a signature record
  const existingSignatures = await getSignaturesForRequest(request.id);

  // Always use the original PDF as the base to avoid layering old signatures on top of new ones
  // When a signature is updated, we want to start fresh from the original PDF and only draw
  // the current signatures from the database, not build on top of previously signed PDFs
  const basePdfUrl = request.pdf_file_url;

  // Download base PDF from R2
  const baseUrl = new URL(basePdfUrl);
  const keyFromUrl = baseUrl.pathname.replace(/^\//, '');

  const getPdfCommand = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: keyFromUrl,
  });

  const pdfObject = await r2Client.send(getPdfCommand);
  if (!pdfObject.Body) {
    throw new Error('Failed to download base PDF');
  }

  const pdfBytes = await streamToBuffer(pdfObject.Body);

  // Manipulate PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Apply signatures to all fields that have signatures
  for (const field of updatedRequest.fields) {
    if (!field.signature_image_url) {
      continue; // Skip fields without signatures
    }

    // Download signature image from R2
    const sigUrl = new URL(field.signature_image_url);
    const sigKey = sigUrl.pathname.replace(/^\//, '');
    
    const getSigCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sigKey,
    });

    const sigObject = await r2Client.send(getSigCommand);
    if (!sigObject.Body) {
      console.warn(`Failed to download signature for field ${field.id}`);
      continue;
    }

    const sigBytes = await streamToBuffer(sigObject.Body);
    const pngImage = await pdfDoc.embedPng(sigBytes);

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

    // Get the actual signature image dimensions (not the canvas size)
    const sigWidth = pngImage.width;
    const sigHeight = pngImage.height;

    // Calculate scale factors for both dimensions
    // The limiting factor will determine the final scale
    const scaleWidth = fieldWidth / sigWidth;
    const scaleHeight = fieldHeight / sigHeight;

    // Use the smaller scale factor (limiting factor) to maintain aspect ratio
    // This ensures the signature fits within the field box without distortion
    const scale = Math.min(scaleWidth, scaleHeight);

    // Calculate final dimensions maintaining original proportions
    const finalWidth = sigWidth * scale;
    const finalHeight = sigHeight * scale;

    page.drawImage(pngImage, {
      x,
      y,
      width: finalWidth,
      height: finalHeight,
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

  // Store or update signature record
  if (existingSignatures.length > 0) {
    // Update existing signature record
    const { error: updateError } = await supabase
      .from('pdf_signatures')
      .update({
        signed_pdf_url: signedPdfUrl,
        signer_name: params.signerName || null,
        signer_email: params.signerEmail || null,
        signer_ip: params.signerIp || null,
      })
      .eq('id', existingSignatures[0].id);

    if (updateError) {
      console.error('Error updating PDF signature record:', updateError);
    }
  } else {
    // Create new signature record
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
  }

  // Mark request as completed only if ALL fields (both signature and data_entry) are filled
  // This ensures the document is only considered fully signed when every field is completed
  if (allFieldsSigned) {
    const { error: updateError } = await supabase
      .from('pdf_signature_requests')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (updateError) {
      console.error('Error updating request status to completed:', updateError);
    }
  } else {
    // Ensure status is not 'completed' if not all fields are filled
    // This handles the case where fields might have been removed or if status was incorrectly set
    if (request.status === 'completed') {
      const { error: updateError } = await supabase
        .from('pdf_signature_requests')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      if (updateError) {
        console.error('Error reverting request status from completed:', updateError);
      }
    }
  }

  return { signedPdfUrl };
}


