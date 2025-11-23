"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PdfSignatureRecord } from "@/lib/pdf-signatures";
import { toast } from "sonner";

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
  field_type?: 'signature' | 'data_entry';
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
  fields: PdfSignatureField[];
  selectedFieldId: string | null;
  onFieldAdd: (field: PdfSignatureField) => void;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldUpdate: (field: PdfSignatureField) => void;
  onFieldDelete: (fieldId: string) => void;
  defaultWidth: number;
  defaultHeight: number;
}

function PdfViewer({ 
  requestId, 
  fields, 
  selectedFieldId,
  onFieldAdd, 
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  defaultWidth,
  defaultHeight
}: PdfViewerProps) {
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

    const width = defaultWidth;
    const height = defaultHeight;

    const x = Math.min(Math.max(relX, 0), 1 - width);
    const y = Math.min(Math.max(relY, 0), 1 - height);

    const newField: PdfSignatureField = {
      id: `temp-${Date.now()}`,
      page_number: pageNumber,
      x,
      y,
      width,
      height,
      label: null,
      field_type: 'signature', // Default to signature, can be changed in the sidebar
    };

    onFieldAdd(newField);
    onFieldSelect(newField.id);
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
            fields={fields.filter((f) => f.page_number === pageNumber)}
            selectedFieldId={selectedFieldId}
            onFieldSelect={onFieldSelect}
            onFieldUpdate={onFieldUpdate}
            onFieldDelete={onFieldDelete}
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
  fields: PdfSignatureField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldUpdate: (field: PdfSignatureField) => void;
  onFieldDelete: (fieldId: string) => void;
  onClick: (
    e: React.MouseEvent<HTMLCanvasElement>,
    pageNumber: number,
    canvas: HTMLCanvasElement | null
  ) => void;
}

function PdfPage({ 
  pdf, 
  pageNumber, 
  fields, 
  selectedFieldId,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  onClick 
}: PdfPageProps) {
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
      {fields.map((field) => (
        <DraggableResizableField
          key={field.id}
          field={field}
          isSelected={selectedFieldId === field.id}
          canvasRef={canvasRef}
          onSelect={() => onFieldSelect(field.id)}
          onUpdate={(updated) => onFieldUpdate(updated)}
          onDelete={() => {
            const isDataEntry = field.field_type === 'data_entry';
            if (confirm(`Delete ${isDataEntry ? 'data entry' : 'signature'} field?`)) {
              onFieldDelete(field.id);
            }
          }}
        />
      ))}
      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
        Page {pageNumber}
      </div>
    </div>
  );
}

interface DraggableResizableFieldProps {
  field: PdfSignatureField;
  isSelected: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onSelect: () => void;
  onUpdate: (field: PdfSignatureField) => void;
  onDelete: () => void;
}

function DraggableResizableField({
  field,
  isSelected,
  canvasRef,
  onSelect,
  onUpdate,
  onDelete,
}: DraggableResizableFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fieldStart, setFieldStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const isDataEntry = field.field_type === 'data_entry';
  const borderColor = isDataEntry 
    ? (isSelected ? "border-green-600" : "border-green-500")
    : (isSelected ? "border-blue-600" : "border-blue-500");
  const bgColor = isDataEntry
    ? (isSelected ? "bg-green-600/30" : "bg-green-500/20")
    : (isSelected ? "bg-blue-600/30" : "bg-blue-500/20");
  const labelBg = isDataEntry ? "bg-green-600" : "bg-blue-600";
  const handleColor = isDataEntry ? "bg-green-600" : "bg-blue-600";

  const getRelativePosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail === 2) {
      // Double click
      onDelete();
      return;
    }
    onSelect();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / rect.width;
    const startY = (e.clientY - rect.top) / rect.height;
    
    setDragStart({ x: startX, y: startY });
    setFieldStart({ x: field.x, y: field.y, width: field.width, height: field.height });
    setIsDragging(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / rect.width;
    const startY = (e.clientY - rect.top) / rect.height;
    
    setDragStart({ x: startX, y: startY });
    setFieldStart({ x: field.x, y: field.y, width: field.width, height: field.height });
    setIsResizing(true);
    setResizeHandle(handle);
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / rect.width;
      const currentY = (e.clientY - rect.top) / rect.height;
      
      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;

      if (isResizing && resizeHandle) {
        // Handle resizing
        let newX = fieldStart.x;
        let newY = fieldStart.y;
        let newWidth = fieldStart.width;
        let newHeight = fieldStart.height;

        if (resizeHandle.includes('n')) {
          newHeight = Math.max(0.02, fieldStart.height - deltaY);
          newY = Math.max(0, fieldStart.y + fieldStart.height - newHeight);
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(0.02, fieldStart.height + deltaY);
          newY = fieldStart.y;
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(0.02, fieldStart.width - deltaX);
          newX = Math.max(0, fieldStart.x + fieldStart.width - newWidth);
        }
        if (resizeHandle.includes('e')) {
          newWidth = Math.max(0.02, fieldStart.width + deltaX);
          newX = fieldStart.x;
        }

        // Ensure field stays within bounds
        if (newX + newWidth > 1) {
          newWidth = 1 - newX;
        }
        if (newY + newHeight > 1) {
          newHeight = 1 - newY;
        }

        onUpdate({
          ...field,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      } else if (isDragging) {
        // Handle dragging
        let newX = fieldStart.x + deltaX;
        let newY = fieldStart.y + deltaY;

        // Keep within bounds
        newX = Math.max(0, Math.min(1 - fieldStart.width, newX));
        newY = Math.max(0, Math.min(1 - fieldStart.height, newY));

        onUpdate({
          ...field,
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, resizeHandle, dragStart, fieldStart, field, onUpdate]);

  const resizeHandles = [
    { position: 'nw', cursor: 'nw-resize', style: { top: '-4px', left: '-4px' } },
    { position: 'n', cursor: 'n-resize', style: { top: '-4px', left: '50%', transform: 'translateX(-50%)' } },
    { position: 'ne', cursor: 'ne-resize', style: { top: '-4px', right: '-4px' } },
    { position: 'e', cursor: 'e-resize', style: { top: '50%', right: '-4px', transform: 'translateY(-50%)' } },
    { position: 'se', cursor: 'se-resize', style: { bottom: '-4px', right: '-4px' } },
    { position: 's', cursor: 's-resize', style: { bottom: '-4px', left: '50%', transform: 'translateX(-50%)' } },
    { position: 'sw', cursor: 'sw-resize', style: { bottom: '-4px', left: '-4px' } },
    { position: 'w', cursor: 'w-resize', style: { top: '50%', left: '-4px', transform: 'translateY(-50%)' } },
  ];

  return (
    <>
      <div
        ref={fieldRef}
        className={`absolute border-2 rounded ${borderColor} ${bgColor} ${isSelected ? 'cursor-move' : 'cursor-pointer'}`}
        style={{
          left: `${field.x * 100}%`,
          top: `${field.y * 100}%`,
          width: `${field.width * 100}%`,
          height: `${field.height * 100}%`,
        }}
        onMouseDown={handleMouseDown}
      >
        {isSelected && (
          <>
            <div className={`absolute -top-6 left-0 text-xs ${labelBg} text-white px-2 py-1 rounded z-10`}>
              {isDataEntry ? "Data Entry" : "Signature"} - double-click to delete
            </div>
            {resizeHandles.map((handle) => (
              <div
                key={handle.position}
                className={`absolute w-3 h-3 ${handleColor} border-2 border-white rounded-sm shadow-sm z-20`}
                style={{
                  ...handle.style,
                  cursor: handle.cursor,
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, handle.position)}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}

export default function SignaturePlacementPage({ id }: SignaturePlacementPageProps) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<PdfSignatureRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<PdfSignatureField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<PdfSignatureRecord[]>([]);
  const [copyingLink, setCopyingLink] = useState(false);
  const [defaultWidth, setDefaultWidth] = useState(0.25);
  const [defaultHeight, setDefaultHeight] = useState(0.06);

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
        setFields(data.fields || []);

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

  const handleFieldAdd = (field: PdfSignatureField) => {
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
  };

  const handleFieldUpdate = (updatedField: PdfSignatureField) => {
    setFields((prev) =>
      prev.map((f) => (f.id === updatedField.id ? updatedField : f))
    );
  };

  const handleFieldDelete = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleSave = async () => {
    if (fields.length === 0) {
      toast.error("No fields to save", {
        description: "Click on the document preview to add at least one signature field.",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/pdf-signatures/requests/${id}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: fields.map((f) => ({
            page_number: f.page_number,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            label: null,
            field_type: f.field_type || 'signature',
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save fields");
      }
      setFields(data.fields || []);
      
      // Copy link to clipboard
      const publicLink = `${typeof window !== "undefined" ? window.location.origin : ""}/sign/${
        request?.public_token
      }`;
      try {
        await navigator.clipboard.writeText(publicLink);
        toast.success(`Saved ${fields.length} field${fields.length !== 1 ? "s" : ""}`, {
          description: "Signing link copied to clipboard!",
          duration: 5000,
        });
      } catch (clipboardErr) {
        // Fallback if clipboard fails
        toast.success(`Saved ${fields.length} field${fields.length !== 1 ? "s" : ""}`, {
          description: "Fields saved successfully. You can copy the signing link above.",
          duration: 5000,
        });
      }
    } catch (err) {
      toast.error("Failed to save fields", {
        description: err instanceof Error ? err.message : "An error occurred while saving.",
      });
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
          <h1 className="text-3xl font-bold">Place signatures for PDF</h1>
          <p className="text-muted-foreground">
            {request.title} &middot; Click on the preview to add signature fields. You can add multiple signatures.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-[2fr,1fr] items-start">
          <div className="space-y-3">
            <PdfViewer 
              requestId={id} 
              fields={fields}
              selectedFieldId={selectedFieldId}
              onFieldAdd={handleFieldAdd}
              onFieldSelect={setSelectedFieldId}
              onFieldUpdate={handleFieldUpdate}
              onFieldDelete={handleFieldDelete}
              defaultWidth={defaultWidth}
              defaultHeight={defaultHeight}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Click anywhere on the PDF to add a signature field. Click a field to select it, double-click to delete it. The blue boxes show signature positions.
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
                1. Click anywhere on the PDF to add signature fields (you can add multiple).
              </p>
              <p>2. Click a field to select it, then drag to move or use the handles to resize.</p>
              <p>3. Double-click a field to delete it.</p>
              <p>4. Click &quot;Save signature positions&quot; when done.</p>
              <p>5. Share the signing link above with anyone (no login required).</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <label className="block text-sm font-medium">Default Size for New Fields</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Width (%)</label>
                  <input
                    type="number"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={defaultWidth}
                    onChange={(e) => {
                      const newWidth = Math.max(0.05, Math.min(1, parseFloat(e.target.value) || 0.25));
                      setDefaultWidth(newWidth);
                    }}
                    className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Height (%)</label>
                  <input
                    type="number"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={defaultHeight}
                    onChange={(e) => {
                      const newHeight = Math.max(0.05, Math.min(1, parseFloat(e.target.value) || 0.06));
                      setDefaultHeight(newHeight);
                    }}
                    className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set the default size for new signature boxes. You can adjust individual boxes after selecting them.
              </p>
            </div>

            {fields.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Signature Fields ({fields.length})</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className={`p-2 rounded border text-xs cursor-pointer ${
                        selectedFieldId === field.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => setSelectedFieldId(field.id)}
                    >
                      <div className="font-medium flex items-center gap-2">
                        {field.field_type === 'data_entry' ? "Data Entry" : "Signature"}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          field.field_type === 'data_entry'
                            ? "bg-green-100 text-green-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {field.field_type === 'data_entry' ? "Data" : "Sign"}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Page {field.page_number} &middot; {Math.round(field.x * 100)}%, {Math.round(field.y * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || fields.length === 0}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : `Save ${fields.length} signature field${fields.length !== 1 ? "s" : ""}`}
            </button>
            {selectedFieldId && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Field Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const field = fields.find((f) => f.id === selectedFieldId);
                        if (field) {
                          handleFieldUpdate({ ...field, field_type: 'signature' });
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded border text-sm font-medium ${
                        fields.find((f) => f.id === selectedFieldId)?.field_type !== 'data_entry'
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const field = fields.find((f) => f.id === selectedFieldId);
                        if (field) {
                          handleFieldUpdate({ ...field, field_type: 'data_entry' });
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded border text-sm font-medium ${
                        fields.find((f) => f.id === selectedFieldId)?.field_type === 'data_entry'
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      Data Entry
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fields.find((f) => f.id === selectedFieldId)?.field_type === 'data_entry'
                      ? "Data entry fields allow typing only (regular font)"
                      : "Signature fields allow drawing or typing (handwritten font)"}
                  </p>
                </div>
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Drag the box to move it, or drag the corner/edge handles to resize it.
                  </p>
                </div>
              </div>
            )}
            {fields.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Clear all ${fields.length} signature field(s)?`)) {
                    setFields([]);
                    setSelectedFieldId(null);
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Clear all fields
              </button>
            )}

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
                        {sig.signer_ip && (
                          <div className="text-muted-foreground text-[10px]">
                            IP: {sig.signer_ip}
                          </div>
                        )}
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


