"use client";

import { useEffect, useState } from "react";
import { Mail, Clock, Eye, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EmailRecord {
  id: string;
  tracking_id: string;
  sender_user_id: string | null;
  recipient_email: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  opened_count: number;
  created_at: string;
}

interface EmailHistoryProps {
  refreshTrigger?: number;
}

export default function EmailHistory({ refreshTrigger }: EmailHistoryProps) {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/emails", {
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load emails");
      }

      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err) {
      console.error("Error loading emails:", err);
      setError(err instanceof Error ? err.message : "Failed to load email history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [refreshTrigger]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return formatDate(dateString);
  };

  const handleDelete = async (emailId: string, subject: string) => {
    if (!confirm(`Are you sure you want to delete the email tracking record for "${subject}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(emailId);
      
      // Ensure the emailId is properly encoded
      const encodedId = encodeURIComponent(emailId);
      const response = await fetch(`/api/admin/emails/${encodedId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to delete email record");
      }

      toast.success("Email tracking record deleted successfully");
      
      // Remove from local state
      setEmails((prev) => prev.filter((email) => email.id !== emailId));
    } catch (err) {
      console.error("Error deleting email:", err);
      toast.error("Failed to delete email record", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading email history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <button
              onClick={loadEmails}
              className="mt-4 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email History
            </CardTitle>
            <CardDescription>
              View all sent emails and their open status
            </CardDescription>
          </div>
          <button
            onClick={loadEmails}
            className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No emails sent yet.</p>
            <p className="text-sm mt-2">Send an email to see it appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="border border-border/60 rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {email.subject}
                      </h3>
                      {email.opened_at && (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 bg-green-500/20 text-green-400 border-green-500/30"
                        >
                          <Eye className="w-3 h-3" />
                          Opened
                        </Badge>
                      )}
                      {!email.opened_at && (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        >
                          Unopened
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      To: {email.recipient_email}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Sent {getTimeAgo(email.sent_at)}</span>
                      </div>
                      {email.opened_at && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>
                            Opened {getTimeAgo(email.opened_at)}
                            {email.opened_count > 1 && ` (${email.opened_count}x)`}
                          </span>
                        </div>
                      )}
                      {!email.opened_at && (
                        <span className="text-yellow-400">Not opened yet</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(email.id, email.subject)}
                    disabled={deletingId === email.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {deletingId === email.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

