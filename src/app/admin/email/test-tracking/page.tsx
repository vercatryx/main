"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestTrackingPage() {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const testTracking = async () => {
    if (!trackingId.trim()) {
      setResult("Please enter a tracking ID");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Test the tracking endpoint
      const response = await fetch(`/api/admin/email/track/${trackingId}`);
      const blob = await response.blob();

      if (response.ok && blob.type === "image/png") {
        setResult(`✅ Tracking pixel loaded successfully! Check your database to see if opened_at was updated.`);
        
        // Also check the email record
        setTimeout(async () => {
          try {
            const emailResponse = await fetch("/api/admin/emails");
            const emailData = await emailResponse.json();
            const email = emailData.emails?.find((e: any) => e.tracking_id === trackingId);
            if (email) {
              setResult((prev) => 
                `${prev}\n\nEmail Status:\n- Opened: ${email.opened_at ? 'Yes' : 'No'}\n- Open Count: ${email.opened_count}\n- Opened At: ${email.opened_at || 'Not opened yet'}`
              );
            }
          } catch (err) {
            console.error("Error fetching email status:", err);
          }
        }, 1000);
      } else {
        setResult(`❌ Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Test Email Tracking</CardTitle>
          <CardDescription>
            Enter a tracking ID to test if the tracking pixel endpoint is working correctly.
            You can find tracking IDs in the admin_emails table in your database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tracking ID</label>
            <Input
              type="text"
              placeholder="Enter tracking ID here"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
            />
          </div>
          <Button onClick={testTracking} disabled={loading}>
            {loading ? "Testing..." : "Test Tracking Pixel"}
          </Button>
          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

