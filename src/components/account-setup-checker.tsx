"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import LogoWineFill from "@/components/loading";

interface AccountSetupCheckerProps {
  clerkUserId: string;
  userEmail: string;
}

export default function AccountSetupChecker({ clerkUserId, userEmail }: AccountSetupCheckerProps) {
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAndSyncUser = async () => {
      try {
        // Try to sync the user via webhook endpoint
        const response = await fetch('/api/webhooks/clerk/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clerkUserId,
            email: userEmail,
          }),
        });

        if (response.ok) {
          // User was synced successfully, reload the page
          router.refresh();
        } else {
          // User still not in system
          setError('Your account has not been set up yet. Please contact your administrator.');
          setChecking(false);
        }
      } catch (err) {
        console.error('Error syncing user:', err);
        setError('Unable to verify your account. Please contact your administrator.');
        setChecking(false);
      }
    };

    // Check after a short delay to allow webhook to process
    const timeout = setTimeout(() => {
      checkAndSyncUser();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [clerkUserId, userEmail, router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LogoWineFill
              width={300}
              duration={10}
            />
            <h1 className="text-3xl font-bold mb-4 text-foreground mt-6">
              Setting Up Your Account...
            </h1>
            <p className="text-lg text-muted-foreground">
              Please wait while we verify your account.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Account Not Set Up
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {error || 'Your account has not been set up yet. Please contact your administrator.'}
          </p>
          <SignOutButton redirectUrl="/sign-in">
            <button className="px-6 py-3 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors text-foreground font-medium">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
