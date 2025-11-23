"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Configure PDF.js worker to load from the local public/ directory
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PdfSignatureField {
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

interface PdfSignatureRequest {
  id: string;
  title: string;
  pdf_file_url: string;
  status: "draft" | "sent" | "completed";
  submitted_at?: string | null;
  fields?: PdfSignatureField[];
}

interface SignPageClientProps {
  token: string;
}

export default function SignPageClient({ token }: SignPageClientProps) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<PdfSignatureRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw"); // Default to drawing for signatures
  const [typedSignature, setTypedSignature] = useState("");
  const [liveSignaturePreviewUrl, setLiveSignaturePreviewUrl] = useState<string | null>(null);
  const [submittingSignature, setSubmittingSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pdf, setPdf] = useState<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [activeField, setActiveField] = useState<PdfSignatureField | null>(null);
  const [signaturesByFieldId, setSignaturesByFieldId] = useState<Record<string, string>>({});
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const downloadButtonRef = useRef<HTMLAnchorElement | null>(null);
  const isEditingRef = useRef(false);

  // Ensure smoother signature strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000";
  }, []);

  // Track the previous active field ID to only set mode when field changes
  const prevActiveFieldIdRef = useRef<string | null>(null);

  // When reopening the modal and we already have a saved signature for this field,
  // draw it into the canvas so the user can see/edit it (only for signature fields, not data entry).
  // Note: The signature will be cleared when the user starts drawing or typing.
  useEffect(() => {
    if (!showSignatureModal || !activeField) {
      prevActiveFieldIdRef.current = null;
      return;
    }
    
    // Only set mode when field changes, not when signaturesByFieldId changes
    const fieldChanged = prevActiveFieldIdRef.current !== activeField.id;
    if (fieldChanged) {
      prevActiveFieldIdRef.current = activeField.id;
    }
    
    // For data entry fields, always use type mode and clear typed signature if switching fields
    if (activeField.field_type === 'data_entry') {
      if (fieldChanged) {
        setSignatureMode("type");
        // If we have a saved signature for this field, we'll show it in preview
        // But we can't extract text from image, so just clear typedSignature for new input
        const savedSignature = signaturesByFieldId[activeField.id];
        if (!savedSignature) {
          setTypedSignature("");
        }
      }
      return;
    }
    
    // For signature fields, only set mode when field changes (don't override if user is actively editing)
    if (fieldChanged) {
      // Only set to draw mode if we're not actively editing (user might be typing)
      if (!isEditingRef.current) {
        setSignatureMode("draw");
      }
      isEditingRef.current = false; // Reset editing flag when field changes
    }
    
    const signatureForField = signaturesByFieldId[activeField.id];
    if (!signatureForField) {
      // Clear canvas if no signature for this field (only when field changes)
      if (fieldChanged) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
      return;
    }
    
    // Only load signature into canvas when field changes
    if (fieldChanged) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = document.createElement("img");
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Scale to fill as much of the canvas as possible while maintaining aspect ratio
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (canvas.width - drawWidth) / 2;
        const offsetY = (canvas.height - drawHeight) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      };
      img.src = signatureForField;
    }
  }, [showSignatureModal, activeField, signaturesByFieldId]);

  // When the signature modal is open, prevent the underlying page/PDF from scrolling
  useEffect(() => {
    if (!showSignatureModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showSignatureModal]);

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    // Adjust for potential CSS scaling vs. internal canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pdf-signatures/public/${token}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load document");
        }
        const data = await res.json();
        setRequest(data);

        // Always try to fetch the signed PDF URL if it exists (for completed or submitted documents)
        try {
          const sigRes = await fetch(`/api/pdf-signatures/public/${token}/signed-pdf`, { cache: "no-store" });
          if (sigRes.ok) {
            const sigData = await sigRes.json();
            if (sigData.signedPdfUrl) {
              setSignedPdfUrl(sigData.signedPdfUrl);
            }
          }
        } catch (err) {
          console.warn('Failed to load signed PDF URL:', err);
        }

        // Load existing signatures from fields
        if (data.fields && Array.isArray(data.fields)) {
          const signaturePromises = data.fields
            .filter((field: PdfSignatureField) => field.signature_image_url)
            .map(async (field: PdfSignatureField) => {
              try {
                const sigRes = await fetch(field.signature_image_url!);
                if (sigRes.ok) {
                  const blob = await sigRes.blob();
                  return new Promise<{ fieldId: string; dataUrl: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      resolve({
                        fieldId: field.id,
                        dataUrl: reader.result as string,
                      });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                }
              } catch (err) {
                console.warn(`Failed to load signature for field ${field.id}:`, err);
              }
              return null;
            });

          const signatureResults = await Promise.all(signaturePromises);
          const existingSignatures: Record<string, string> = {};
          signatureResults.forEach((result) => {
            if (result) {
              existingSignatures[result.fieldId] = result.dataUrl;
            }
          });
          setSignaturesByFieldId(existingSignatures);
        }

        // Load PDF for viewing using same library as admin placement
        const loadingTask = getDocument(`/api/pdf-signatures/public/${token}/pdf`);
        const loadedPdf = await loadingTask.promise;
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (signatureMode !== "draw") return;
    // Prevent the page from scrolling/dragging on touch devices while drawing
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear old signature when user starts drawing
    if (activeField && signaturesByFieldId[activeField.id]) {
      const updatedSignatures = { ...signaturesByFieldId };
      delete updatedSignatures[activeField.id];
      setSignaturesByFieldId(updatedSignatures);
    }

    // Ensure we capture the pointer so drawing continues even if the finger/mouse
    // leaves the canvas bounds slightly.
    try {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    } catch {
      // Not critical if this fails (e.g., some browsers)
    }

    setDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (signatureMode !== "draw") return;
    if (!drawing) return;
    // Keep touch move from scrolling the modal/page
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDrawing(false);
    // Release pointer capture when done drawing
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if unsupported
    }
  };

  const generateTypedSignatureDataUrl = (isDataEntry: boolean = false) => {
    const nameToRender = (typedSignature || (isDataEntry ? "" : signerName)).trim();
    if (!nameToRender) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = 800;
    offscreen.height = 200;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    // Ensure fully transparent background
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);

    // Different font styles based on field type
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isDataEntry) {
      // Regular font for data entry
      ctx.font = '48px Arial, sans-serif';
    } else {
      // Handwritten-style text for signatures
      ctx.font = '64px "Lucida Handwriting", "Brush Script MT", cursive';
    }
    ctx.fillText(nameToRender, offscreen.width / 2, offscreen.height / 2);

    // Get image data to find actual content bounds
    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;
    
    // Find the bounding box of non-transparent pixels
    let minX = offscreen.width;
    let minY = offscreen.height;
    let maxX = 0;
    let maxY = 0;
    
    for (let y = 0; y < offscreen.height; y++) {
      for (let x = 0; x < offscreen.width; x++) {
        const idx = (y * offscreen.width + x) * 4;
        const alpha = data[idx + 3];
        if (alpha > 0) {
          // Found a non-transparent pixel
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // If no content found, return original
    if (minX >= maxX || minY >= maxY) {
      return offscreen.toDataURL("image/png");
    }
    
    // Add small padding (2% of width/height, minimum 4px)
    const paddingX = Math.max(4, Math.floor((maxX - minX) * 0.02));
    const paddingY = Math.max(4, Math.floor((maxY - minY) * 0.02));
    
    minX = Math.max(0, minX - paddingX);
    minY = Math.max(0, minY - paddingY);
    maxX = Math.min(offscreen.width, maxX + paddingX);
    maxY = Math.min(offscreen.height, maxY + paddingY);
    
    // Create cropped canvas
    const croppedWidth = maxX - minX;
    const croppedHeight = maxY - minY;
    
    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;
    const croppedCtx = croppedCanvas.getContext("2d");
    if (!croppedCtx) return offscreen.toDataURL("image/png");
    
    // Draw the cropped portion
    croppedCtx.drawImage(
      offscreen,
      minX, minY, croppedWidth, croppedHeight,
      0, 0, croppedWidth, croppedHeight
    );
    
    return croppedCanvas.toDataURL("image/png");
  };

  // Keep a live preview image while typing (only for signature fields, not data entry)
  useEffect(() => {
    if (activeField?.field_type === 'data_entry') {
      // For data entry, don't show preview
      setLiveSignaturePreviewUrl(null);
    } else if (signatureMode === "type") {
      const url = generateTypedSignatureDataUrl(false);
      setLiveSignaturePreviewUrl(url);
    } else {
      setLiveSignaturePreviewUrl(null);
    }
  }, [typedSignature, signerName, signatureMode, activeField]);

  const handleSave = async (signatureOverride?: string, fieldId?: string) => {
    if (!request || !activeField) return;
    const targetFieldId = fieldId || activeField.id;
    
    const payloadSignature =
      signatureOverride ||
      canvasRef.current?.toDataURL("image/png") ||
      "";

    if (!payloadSignature) {
      alert("Please sign the document first.");
      return;
    }

    setSubmittingSignature(true);
    try {
      const res = await fetch(`/api/pdf-signatures/public/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName,
          signerEmail,
          fieldId: targetFieldId,
          signatureImageDataUrl: payloadSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save signature");
      }

      // Store the signature for this specific field
      const updatedSignatures = {
        ...signaturesByFieldId,
        [targetFieldId]: payloadSignature,
      };
      setSignaturesByFieldId(updatedSignatures);

      if (data.signedPdfUrl) {
        setSignedPdfUrl(data.signedPdfUrl);
      }

      // Check if all fields are completed (both signature fields and data_entry fields)
      // Both field types store their data in the signaturesByFieldId object
      const allFields = request.fields || [];
      const allSigned = allFields.length > 0 && allFields.every((field) => updatedSignatures[field.id]);

      if (allSigned) {
        // Optimistically mark as completed so the UI reflects that it is signed
        // Note: The server will verify this and only mark as completed when ALL fields are filled
        setRequest((prev) => (prev ? { ...prev, status: "completed" } : prev));
        
        // Wait a moment for DOM to update, then check if download button is already visible
        setTimeout(() => {
          const checkButtonVisible = () => {
            if (!downloadButtonRef.current) return false;
            const rect = downloadButtonRef.current.getBoundingClientRect();
            return rect.top >= 0 && rect.top <= window.innerHeight;
          };

          const isButtonVisible = checkButtonVisible();
          
          // Show success toast with scroll instructions
          const toastId = toast.success("All fields completed!", {
            description: `You can now scroll down to submit your signatures and download the document ⬇️ ⬇️ ⬇️`,
            duration: isButtonVisible ? 6000 : Infinity, // Stay until button is visible, or 6 sec if already visible
            style: {
              fontSize: "18px",
              padding: "24px 28px",
              minWidth: "450px",
            },
          });

          // If button is not visible, set up observer to dismiss toast when it becomes visible
          if (!isButtonVisible && downloadButtonRef.current) {
            const observer = new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                    // Button is now visible, dismiss toast after a short delay
                    setTimeout(() => {
                      toast.dismiss(toastId);
                    }, 1000);
                    observer.disconnect();
                  }
                });
              },
              { threshold: 0.1 }
            );
            
            observer.observe(downloadButtonRef.current);
            
            // Fallback: dismiss after 30 seconds max if observer doesn't trigger
            setTimeout(() => {
              observer.disconnect();
              toast.dismiss(toastId);
            }, 30000);
          }
        }, 100);
      } else {
        // Show success toast for single field
        const remainingCount = allFields.length - Object.keys(updatedSignatures).length;
        toast.success("Field saved!", {
          description: remainingCount > 0 
            ? `${remainingCount} field${remainingCount > 1 ? 's' : ''} remaining. Fill all fields, then click "Submit Signatures".`
            : "All fields are complete. Click 'Submit Signatures' to finalize.",
          duration: 5000,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while saving.";
      toast.error("Failed to save", {
        description: errorMessage.includes("submitted") 
          ? "This document has already been submitted and cannot be modified."
          : errorMessage,
      });
    } finally {
      setSubmittingSignature(false);
    }
  };

  async function handleSubmit() {
    if (!request) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/pdf-signatures/public/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit document");
      }

      // Update the request state to reflect submission
      setRequest((prev) => (prev ? { ...prev, submitted_at: new Date().toISOString() } : prev));

      // Update signed PDF URL if provided
      if (data.signedPdfUrl) {
        setSignedPdfUrl(data.signedPdfUrl);
      }

      toast.success("Signatures submitted successfully!", {
        description: "Your document has been finalized. Signatures are now locked and cannot be modified.",
        duration: 6000,
      });
    } catch (err) {
      toast.error("Failed to submit signatures", {
        description: err instanceof Error ? err.message : "Please try again. Your signatures are still saved and can be submitted later.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendEmail() {
    if (!emailInput.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch(`/api/pdf-signatures/public/${token}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success("Email sent!", {
        description: `The PDF has been sent to ${emailInput.trim()}`,
      });
      setShowEmailDialog(false);
      setEmailInput("");
    } catch (err) {
      toast.error("Failed to send email", {
        description: err instanceof Error ? err.message : "An error occurred while sending the email.",
      });
    } finally {
      setSendingEmail(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading document…</div>;
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-2">Unable to load document</h1>
          <p className="text-muted-foreground text-sm">{error || "Please check your link."}</p>
        </div>
      </div>
    );
  }

  // Only consider the document signed when status is 'completed'
  // This ensures ALL fields (both signature and data_entry) must be filled
  const isSigned = request.status === "completed";
  const isSubmitted = !!request.submitted_at;
  
  // Check if all fields are signed
  const allFields = request.fields || [];
  const allFieldsSigned = allFields.length > 0 && allFields.every((field) => signaturesByFieldId[field.id]);
  const canSubmit = allFieldsSigned && !isSubmitted;
  
  // Use signed PDF if available, otherwise use the original PDF
  // After submission, we should always have a signed PDF URL
  const downloadHref = signedPdfUrl || request.pdf_file_url;

  const pages = Array.from({ length: numPages || 0 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with logos */}
      <header className="w-full border-b border-border bg-background">
        <div className="w-full max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Image src="/logo-small-white.svg" alt="Vercatryx" width={40} height={40} />
            </Link>
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Image src="/logo-big-white.svg" alt="Vercatryx" width={200} height={200} className="h-16 w-auto" />
            </Link>
            <div className="w-10" /> {/* Spacer for balance */}
          </div>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Sign document</h1>
          <p className="text-muted-foreground">{request.title}</p>
          {isSubmitted ? (
            <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">
              This document has been submitted and signatures cannot be modified.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Click on the signature boxes (blue for signatures, green for data entry) in the document to fill them out.
            </p>
          )}
        </div>

        <section className="space-y-8">
          <div className="flex justify-center">
            <div className="border border-border rounded-lg overflow-hidden bg-muted/10">
              {!pdf ? (
                <div className="flex items-center justify-center min-h-[480px]">
                  <span className="text-sm text-muted-foreground">Loading PDF…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8 py-4">
                  {pages.map((pageNumber) => (
                    <PdfPageForSigning
                      key={pageNumber}
                      pdf={pdf}
                      pageNumber={pageNumber}
                      fields={(request.fields || []).filter((f) => f.page_number === pageNumber)}
                      onSignClick={(field) => {
                        if (isSubmitted) {
                          toast.info("Document already submitted", {
                            description: "This document has been finalized. Signatures cannot be edited or removed.",
                            duration: 4000,
                          });
                          return;
                        }
                        setActiveField(field);
                        // Clear typed signature when opening a new field
                        setTypedSignature("");
                        setConsentGiven(false);
                        setShowSignatureModal(true);
                      }}
                      isSubmitted={isSubmitted}
                      signaturesByFieldId={signaturesByFieldId}
                      liveSignaturePreviewUrl={liveSignaturePreviewUrl}
                      activeFieldId={activeField?.id || null}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 space-y-3">
            {!isSubmitted && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
                  className="inline-flex w-full justify-center px-8 py-4 rounded-xl bg-green-600 text-white text-base font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Signatures"}
                </button>
                {!canSubmit && allFields.length > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Please fill all {allFields.length} field{allFields.length !== 1 ? 's' : ''} before submitting.
                  </p>
                )}
              </>
            )}
            {isSubmitted && (
              <div className="inline-flex w-full justify-center px-8 py-4 rounded-xl bg-green-600/20 text-green-700 dark:text-green-400 text-base font-semibold border border-green-600/30">
                ✓ Document Submitted
              </div>
            )}
            <a
              ref={downloadButtonRef}
              href={downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full justify-center px-8 py-4 rounded-xl border border-border text-base font-semibold hover:bg-muted"
            >
              {signedPdfUrl ? "Download signed PDF" : "Download PDF"}
            </a>
            <button
              type="button"
              onClick={() => setShowEmailDialog(true)}
              className="inline-flex w-full justify-center px-8 py-4 rounded-xl border border-border text-base font-semibold hover:bg-muted"
            >
              Email PDF to yourself
            </button>
          </div>
        </section>

        {showSignatureModal && activeField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 touch-none">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-4 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center">
                <h2 className="text-lg font-semibold">
                  {activeField.field_type === 'data_entry' ? 'Enter data' : 'Add your signature'}
                </h2>
              </div>
              {activeField.field_type !== 'data_entry' && (
                <div className="flex justify-center gap-2 text-xs">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full border text-xs font-medium ${
                      signatureMode === "type"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-background text-foreground border-border"
                    }`}
                    onClick={() => setSignatureMode("type")}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full border text-xs font-medium ${
                      signatureMode === "draw"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-background text-foreground border-border"
                    }`}
                    onClick={() => setSignatureMode("draw")}
                  >
                    Draw
                  </button>
                </div>
              )}

              {activeField.field_type === 'data_entry' ? (
                <div className="space-y-3">
                  <label className="block text-xs text-left font-medium text-muted-foreground">
                    Enter text
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={(e) => {
                        // Mark that we're actively editing to prevent mode switch
                        isEditingRef.current = true;
                        // Clear old signature when user starts typing
                        if (activeField && signaturesByFieldId[activeField.id]) {
                          const updatedSignatures = { ...signaturesByFieldId };
                          delete updatedSignatures[activeField.id];
                          setSignaturesByFieldId(updatedSignatures);
                        }
                        setTypedSignature(e.target.value);
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !submittingSignature && typedSignature.trim()) {
                          e.preventDefault();
                          const dataUrl = generateTypedSignatureDataUrl(true);
                          if (dataUrl) {
                            await handleSave(dataUrl, activeField.id);
                            setShowSignatureModal(false);
                            setConsentGiven(false);
                          }
                        }
                      }}
                      placeholder="Enter text here"
                      className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                      autoFocus
                    />
                  </label>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTypedSignature("")}
                        className="underline hover:no-underline"
                      >
                        Clear
                      </button>
                  
                    </div>
                  </div>
                </div>
              ) : signatureMode === "draw" ? (
                <div className="border border-dashed border-border rounded-lg p-2 bg-muted">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    // touch-none ensures touch input is used for drawing only (no page scroll)
                    className="w-full h-[150px] bg-white cursor-crosshair touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                  <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const canvas = canvasRef.current;
                          if (!canvas) return;
                          const ctx = canvas.getContext("2d");
                          if (!ctx) return;
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          // Also clear the typed signature if we're switching modes
                          setTypedSignature("");
                        }}
                        className="underline hover:no-underline"
                      >
                        Clear
                      </button>
                      <span>Use your mouse or finger to draw</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs text-left font-medium text-muted-foreground">
                    Type your name as you would sign
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={(e) => {
                        // Mark that we're actively editing to prevent mode switch
                        isEditingRef.current = true;
                        // Clear old signature when user starts typing
                        if (activeField && signaturesByFieldId[activeField.id]) {
                          const updatedSignatures = { ...signaturesByFieldId };
                          delete updatedSignatures[activeField.id];
                          setSignaturesByFieldId(updatedSignatures);
                        }
                        setTypedSignature(e.target.value);
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !submittingSignature && typedSignature.trim() && consentGiven) {
                          e.preventDefault();
                          const dataUrl = generateTypedSignatureDataUrl(false);
                          if (dataUrl) {
                            await handleSave(dataUrl, activeField.id);
                            setShowSignatureModal(false);
                            setConsentGiven(false);
                          }
                        }
                      }}
                      placeholder={signerName || "Your full name"}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                    />
                  </label>
                  <div className="border border-dashed border-border rounded-lg p-3 bg-muted">
                    <div className="w-full h-[150px] flex items-center justify-center bg-white">
                      {liveSignaturePreviewUrl ? (
                        <img
                          src={liveSignaturePreviewUrl}
                          alt="Signature preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span
                          className="text-3xl text-foreground leading-none font-normal"
                          style={{
                            fontFamily: '"Lucida Handwriting", "Brush Script MT", cursive',
                          }}
                        >
                          {(typedSignature || signerName || "").trim() || "Your signature"}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setTypedSignature("");
                            // Also clear the canvas if we're switching modes
                            const canvas = canvasRef.current;
                            if (canvas) {
                              const ctx = canvas.getContext("2d");
                              if (ctx) {
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                              }
                            }
                          }}
                          className="underline hover:no-underline"
                        >
                          Clear
                        </button>
                        <span>We&apos;ll convert this to a handwritten-style signature</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-2 space-y-3">
                {activeField.field_type !== 'data_entry' && (
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      id="consent-checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="consent-checkbox"
                      className="text-xs text-foreground leading-relaxed cursor-pointer"
                    >
                      By signing electronically, you consent to use electronic records and signatures.
                    </label>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
                    onClick={() => {
                      setShowSignatureModal(false);
                      setConsentGiven(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingSignature || (activeField.field_type !== 'data_entry' && !consentGiven)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={async () => {
                    if (!activeField) return;
                    
                    let dataUrl: string | null = null;

                    if (activeField.field_type === 'data_entry') {
                      // Data entry fields: only typed text, regular font
                      dataUrl = generateTypedSignatureDataUrl(true);
                      if (!dataUrl || !typedSignature.trim()) {
                        alert("Please enter text first.");
                        return;
                      }
                    } else if (signatureMode === "draw") {
                      // Signature field: drawing mode
                      const canvas = canvasRef.current;
                      if (!canvas) {
                        alert("Please draw your signature first.");
                        return;
                      }
                      dataUrl = canvas.toDataURL("image/png");
                    } else {
                      // Signature field: typing mode
                      dataUrl = generateTypedSignatureDataUrl(false);
                    }

                    if (!dataUrl) {
                      alert(activeField.field_type === 'data_entry' 
                        ? "Please enter text first." 
                        : "Please add your signature first.");
                      return;
                    }

                    if (activeField.field_type !== 'data_entry' && !consentGiven) {
                      alert("Please confirm your consent to use electronic records and signatures.");
                      return;
                    }

                    await handleSave(dataUrl, activeField.id);
                    setShowSignatureModal(false);
                    setConsentGiven(false);
                  }}
                >
                  {submittingSignature 
                    ? "Saving…" 
                    : activeField.field_type === 'data_entry' 
                      ? "Save data" 
                      : "Save signature"}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email PDF to yourself</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you the PDF document.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !sendingEmail && emailInput.trim()) {
                      e.preventDefault();
                      await handleSendEmail();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEmailDialog(false);
                  setEmailInput("");
                }}
                disabled={sendingEmail}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailInput.trim()}
              >
                {sendingEmail ? "Sending..." : "Send Email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface PdfPageForSigningProps {
  pdf: any;
  pageNumber: number;
  fields: PdfSignatureField[];
  onSignClick: (field: PdfSignatureField) => void;
  signaturesByFieldId: Record<string, string>;
  liveSignaturePreviewUrl?: string | null;
  activeFieldId?: string | null;
  isSubmitted?: boolean;
}

function PdfPageForSigning({
  pdf,
  pageNumber,
  fields,
  onSignClick,
  signaturesByFieldId,
  liveSignaturePreviewUrl,
  activeFieldId,
  isSubmitted = false,
}: PdfPageForSigningProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        console.error("Error rendering PDF page:", err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="relative inline-block">
        <canvas ref={canvasRef} className="shadow-sm bg-white max-w-full h-auto" />
        {fields.map((field) => (
          <SignatureFieldButton
            key={field.id}
            field={field}
            onClick={() => onSignClick(field)}
            signaturePreviewUrl={
              signaturesByFieldId[field.id] || 
              (activeFieldId === field.id ? liveSignaturePreviewUrl : null)
            }
            disabled={isSubmitted}
          />
        ))}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
          Page {pageNumber}
        </div>
      </div>
    </div>
  );
}

interface SignatureFieldButtonProps {
  field: PdfSignatureField;
  onClick: () => void;
  signaturePreviewUrl?: string | null;
  disabled?: boolean;
}

function SignatureFieldButton({
  field,
  onClick,
  signaturePreviewUrl,
  disabled = false,
}: SignatureFieldButtonProps) {
  const hasSignature = !!signaturePreviewUrl;
  const isDataEntry = field.field_type === 'data_entry';
  const borderColor = isDataEntry ? "border-green-500" : "border-blue-500";
  const bgColor = isDataEntry ? "bg-green-500/10" : "bg-blue-500/10";
  const textColor = isDataEntry ? "text-green-900" : "text-blue-900";
  const hoverColor = disabled 
    ? "" 
    : isDataEntry 
      ? "hover:bg-green-500/20" 
      : "hover:bg-blue-500/20";
  const opacityClass = disabled ? "opacity-60 cursor-not-allowed" : "";

  return (
    <button
      type="button"
      disabled={disabled}
      className={`absolute border-2 ${borderColor} ${bgColor} rounded text-[10px] font-medium ${textColor} ${hoverColor} ${opacityClass} overflow-hidden`}
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
        height: `${field.height * 100}%`,
        padding: 0,
        margin: 0,
      }}
      onClick={onClick}
    >
      {hasSignature ? (
        <img
          src={signaturePreviewUrl || ""}
          alt={isDataEntry ? "Data entry" : "Signature"}
          className="pointer-events-none w-full h-full"
          style={{ 
            objectFit: 'contain',
            padding: 0,
            margin: 0
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isDataEntry ? "Enter" : "Sign"}
        </div>
      )}
    </button>
  );
}


