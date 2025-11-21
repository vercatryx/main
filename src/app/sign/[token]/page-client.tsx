"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

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
}

interface PdfSignatureRequest {
  id: string;
  title: string;
  pdf_file_url: string;
  status: "draft" | "sent" | "completed";
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
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [liveSignaturePreviewUrl, setLiveSignaturePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pdf, setPdf] = useState<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [activeField, setActiveField] = useState<PdfSignatureField | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // When reopening the modal and we already have a saved signature,
  // draw it into the canvas so the user can see/edit it.
  useEffect(() => {
    if (!showSignatureModal || !signatureDataUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
    img.src = signatureDataUrl;
  }, [showSignatureModal, signatureDataUrl]);

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

  const generateTypedSignatureDataUrl = () => {
    const nameToRender = (typedSignature || signerName).trim();
    if (!nameToRender) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = 800;
    offscreen.height = 200;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    // Ensure fully transparent background
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);

    // Handwritten-style text
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '64px "Lucida Handwriting", "Brush Script MT", cursive';
    ctx.fillText(nameToRender, offscreen.width / 2, offscreen.height / 2);

    return offscreen.toDataURL("image/png");
  };

  // Keep a live preview image while typing
  useEffect(() => {
    if (signatureMode !== "type") {
      setLiveSignaturePreviewUrl(null);
      return;
    }
    const url = generateTypedSignatureDataUrl();
    setLiveSignaturePreviewUrl(url);
  }, [typedSignature, signerName, signatureMode]);

  const handleSave = async (signatureOverride?: string) => {
    if (!request) return;
    const payloadSignature =
      signatureOverride ||
      signatureDataUrl ||
      canvasRef.current?.toDataURL("image/png") ||
      "";

    if (!payloadSignature) {
      alert("Please sign the document first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/pdf-signatures/public/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName,
          signerEmail,
          signatureImageDataUrl: payloadSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save signature");
      }

      if (data.signedPdfUrl) {
        setSignedPdfUrl(data.signedPdfUrl);
      }

      // Optimistically mark as completed so the UI reflects that it is signed
      setRequest((prev) => (prev ? { ...prev, status: "completed" } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save signature");
    } finally {
      setSubmitting(false);
    }
  };

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

  const isSigned = request.status === "completed" || !!signedPdfUrl;
  const downloadHref = isSigned
    ? signedPdfUrl || request.pdf_file_url
    : request.pdf_file_url;

  const pages = Array.from({ length: numPages || 0 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Sign document</h1>
          <p className="text-muted-foreground">{request.title}</p>
          <p className="text-xs text-muted-foreground">
            Click on the blue signature box in the document to open the signature popup.
          </p>
        </header>

        <section className="space-y-8">
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
                      setActiveField(field);
                      setShowSignatureModal(true);
                    }}
                    signaturePreviewUrl={liveSignaturePreviewUrl || signatureDataUrl}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/60">
            <a
              href={downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full justify-center px-8 py-4 rounded-xl border border-border text-base font-semibold hover:bg-muted"
            >
              {isSigned ? "Download signed PDF" : "Download unsigned PDF"}
            </a>
          </div>
        </section>

        {showSignatureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 touch-none">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-4 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Add your signature</h2>
              </div>
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

              {signatureMode === "draw" ? (
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
                      onChange={(e) => setTypedSignature(e.target.value)}
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
                          onClick={() => setTypedSignature("")}
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
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
                  onClick={() => setShowSignatureModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  onClick={async () => {
                    let dataUrl: string | null = null;

                    if (signatureMode === "draw") {
                      const canvas = canvasRef.current;
                      if (!canvas) {
                        alert("Please draw your signature first.");
                        return;
                      }
                      dataUrl = canvas.toDataURL("image/png");
                    } else {
                      dataUrl = generateTypedSignatureDataUrl();
                    }

                    if (!dataUrl) {
                      alert("Please add your signature first.");
                      return;
                    }

                    setSignatureDataUrl(dataUrl);
                    await handleSave(dataUrl);
                    setShowSignatureModal(false);
                  }}
                >
                  {submitting ? "Saving…" : "Save signature"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PdfPageForSigningProps {
  pdf: any;
  pageNumber: number;
  fields: PdfSignatureField[];
  onSignClick: (field: PdfSignatureField) => void;
  signaturePreviewUrl?: string | null;
}

function PdfPageForSigning({
  pdf,
  pageNumber,
  fields,
  onSignClick,
  signaturePreviewUrl,
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
            signaturePreviewUrl={signaturePreviewUrl}
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
}

function SignatureFieldButton({
  field,
  onClick,
  signaturePreviewUrl,
}: SignatureFieldButtonProps) {
  const hasSignature = !!signaturePreviewUrl;

  return (
    <button
      type="button"
      className="absolute border-2 border-blue-500 bg-blue-500/10 rounded text-[10px] font-medium text-blue-900 hover:bg-blue-500/20 overflow-hidden"
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
        height: `${field.height * 100}%`,
      }}
      onClick={onClick}
    >
      {hasSignature ? (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={signaturePreviewUrl || ""}
            alt="Signature"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>
      ) : (
        "Sign"
      )}
    </button>
  );
}


