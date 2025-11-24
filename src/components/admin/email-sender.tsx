"use client";

import { useState, useRef } from "react";
import { Mail, Send, Loader2, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface EmailSenderProps {
  onEmailSent?: () => void;
}

export default function EmailSender({ onEmailSent }: EmailSenderProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: FileAttachment[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: file,
      name: file.name,
      size: file.size,
    }));
    setAttachments((prev) => [...prev, ...newFiles]);
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!to.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);

    try {
      const htmlBody = message.replace(/\n/g, "<br>");
      const textBody = message;

      // Create FormData to handle file attachments
      const formData = new FormData();
      formData.append("to", JSON.stringify(to.split(",").map((email) => email.trim())));
      formData.append("subject", subject);
      formData.append("htmlBody", htmlBody);
      formData.append("textBody", textBody);
      if (replyTo.trim()) {
        formData.append("replyTo", replyTo.trim());
      }

      // Append attachments
      attachments.forEach((attachment) => {
        formData.append("attachments", attachment.file);
      });

      const response = await fetch("/api/admin/email", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success("Email sent successfully!", {
        description: data.message,
      });

      // Reset form
      setTo("");
      setSubject("");
      setMessage("");
      setReplyTo("");
      setAttachments([]);

      // Trigger refresh of email history
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Email via Zoho
          </CardTitle>
          <CardDescription>
            Send emails to one or more recipients. Your message will be automatically formatted in a company-themed template. Separate multiple email addresses with commas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">
                To <span className="text-destructive">*</span>
              </Label>
              <Input
                id="to"
                type="text"
                placeholder="recipient@example.com or recipient1@example.com, recipient2@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                disabled={sending}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple email addresses with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyTo">Reply-To (optional)</Label>
              <Input
                id="replyTo"
                type="email"
                placeholder="reply@example.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                type="text"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Write your email message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={sending}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Your message will be wrapped in a company-themed HTML template. Line breaks will be preserved. You can use basic HTML formatting if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachments"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  disabled={sending}
                  className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
                />
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-muted-foreground">Selected files:</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <Badge
                        key={attachment.id}
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-1"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span className="text-xs">{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(attachment.size)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          disabled={sending}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

