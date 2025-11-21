"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PdfSignatureRecord } from "@/lib/pdf-signatures";

// Configure PDF.js worker to load from the local public/ directory
// (you placed pdf.worker.min.js into /public in step one)
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
  public_token: string;
  fields?: PdfSignatureField[];
}

interface SignaturePlacementPageProps {
  id: string;
}

interface PdfViewerProps {
  requestId: string;
  field: PdfSignatureField | null;
  onFieldChange: (field: PdfSignatureField) => void;
}

function PdfViewer({ requestId, field, onFieldChange }: PdfViewerProps) {
  const [pdf, setPdf] = useState<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadingTask = getDocument(`/api/pdf-signatures/requests/${requestId}/pdf`);
        const loadedPdf = await loadingTask.promise;
        if (cancelled) return;
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages || 1);
      } catch (err) {
        console.error("Error loading PDF in viewer:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[720px] border border-border rounded-lg bg-muted/10">
        <span className="text-sm text-muted-foreground">Loading PDF…</span>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="flex items-center justify-center h-[720px] border border-border rounded-lg bg-muted/10">
        <span className="text-sm text-muted-foreground">
          {error || "Unable to load PDF. Please try again."}
        </span>
      </div>
    );
  }

  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    pageNumber: number,
    canvas: HTMLCanvasElement | null
  ) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const width = 0.25;
    const height = 0.06;

    const x = Math.min(Math.max(relX, 0), 1 - width);
    const y = Math.min(Math.max(relY, 0), 1 - height);

    onFieldChange({
      id: field?.id || "temp",
      page_number: pageNumber,
      x,
      y,
      width,
      height,
      label: "Signature",
    });
  };

  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="border border-border rounded-lg bg-muted/10 h-[720px] overflow-auto">
      <div className="flex flex-col items-center gap-8 py-4">
        {pages.map((pageNumber) => (
          <PdfPage
            key={pageNumber}
            pdf={pdf}
            pageNumber={pageNumber}
            field={field?.page_number === pageNumber ? field : null}
            onClick={handleCanvasClick}
          />
        ))}
      </div>
    </div>
  );
}

interface PdfPageProps {
  pdf: any;
  pageNumber: number;
  field: PdfSignatureField | null;
  onClick: (
    e: React.MouseEvent<HTMLCanvasElement>,
    pageNumber: number,
    canvas: HTMLCanvasElement | null
  ) => void;
}

function PdfPage({ pdf, pageNumber, field, onClick }: PdfPageProps) {
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
    <div className="relative">
      <canvas
        ref={canvasRef}
        onClick={(e) => onClick(e, pageNumber, canvasRef.current)}
        className="cursor-crosshair shadow-sm bg-white"
      />
      {field && (
        <div
          className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/20 rounded"
          style={{
            left: `${field.x * 100}%`,
            top: `${field.y * 100}%`,
            width: `${field.width * 100}%`,
            height: `${field.height * 100}%`,
          }}
        />
      )}
      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
        Page {pageNumber}
      </div>
    </div>
  );
}

export default function SignaturePlacementPage({ id }: SignaturePlacementPageProps) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<PdfSignatureRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [field, setField] = useState<PdfSignatureField | null>(null);
  const [signatures, setSignatures] = useState<PdfSignatureRecord[]>([]);
  const [copyingLink, setCopyingLink] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pdf-signatures/requests/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load request");
        }
        const data = await res.json();
        setRequest(data);
        const firstField = (data.fields || [])[0] || null;
        setField(firstField);

        // Fetch existing signatures for this request
        const sigRes = await fetch(`/api/pdf-signatures/requests/${id}/signatures`, {
          cache: "no-store",
        });
        if (sigRes.ok) {
          const sigData = await sigRes.json();
          setSignatures(Array.isArray(sigData.signatures) ? sigData.signatures : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load request");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!field) {
      alert("Click on the document preview to choose where the signature should go.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/pdf-signatures/requests/${id}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: [
            {
              page_number: field.page_number,
              x: field.x,
              y: field.y,
              width: field.width,
              height: field.height,
              label: field.label,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save field");
      }
      const savedField = (data.fields || [])[0] || null;
      setField(savedField);
      alert("Signature position saved. You can now send the link to be signed.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save signature position");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-2xl font-semibold">Unable to load request</h1>
          <p className="text-muted-foreground text-sm">{error || "Please try again."}</p>
        </div>
      </div>
    );
  }

  const publicLink = `${typeof window !== "undefined" ? window.location.origin : ""}/sign/${
    request.public_token
  }`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Place signature for PDF</h1>
          <p className="text-muted-foreground">
            {request.title} &middot; Click on the preview where the signer should sign.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-[2fr,1fr] items-start">
          <div className="space-y-3">
            <PdfViewer requestId={id} field={field} onFieldChange={setField} />
            <p className="text-xs text-muted-foreground">
              Tip: Scroll through the pages and click exactly where the signer should sign. The
              blue box shows the final signature position.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Signing link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicLink}
                  className="flex-1 px-3 py-2 rounded border border-border bg-muted text-xs"
                />
                <button
                  type="button"
                    className="px-3 py-2 rounded bg-secondary text-xs disabled:opacity-60"
                    disabled={copyingLink}
                  onClick={() => {
                      setCopyingLink(true);
                      navigator.clipboard
                        .writeText(publicLink)
                        .catch(() => {
                          window.prompt("Copy this link:", publicLink);
                        })
                        .finally(() => {
                          setTimeout(() => setCopyingLink(false), 1500);
                        });
                  }}
                >
                    {copyingLink ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                1. Scroll the PDF and click on the page where the signer&apos;s signature should
                appear.
              </p>
              <p>2. Click &quot;Save signature position&quot;.</p>
              <p>3. Share the signing link above with anyone (no login required).</p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save signature position"}
            </button>
            <button
              type="button"
              onClick={() => setField(null)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
            >
              Clear signature box
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/admin";
              }}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted mt-2"
            >
              Back to admin
            </button>

            {signatures.length > 0 && (
              <div className="pt-4 border-t border-border/60 space-y-2">
                <h2 className="text-sm font-semibold">Completed signatures</h2>
                <ul className="space-y-2 text-xs">
                  {signatures.map((sig) => (
                    <li
                      key={sig.id}
                      className="flex items-center justify-between gap-2 rounded border border-border/60 px-3 py-2"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium">
                          {sig.signer_name || "Anonymous signer"}
                        </div>
                        <div className="text-muted-foreground">
                          {sig.signer_email || "No email"} ·{" "}
                          {new Date(sig.signed_at).toLocaleString()}
                        </div>
                      </div>
                      {sig.signed_pdf_url && (
                        <a
                          href={sig.signed_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline whitespace-nowrap"
                        >
                          View signed PDF
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


