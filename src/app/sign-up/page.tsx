"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { verifyInvitationToken } from "@/lib/invitations";
import { useTheme } from "@/contexts/theme-context";
import { getClientsUrl } from "@/lib/clients-url";

function SignUpContent() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const [tokenData, setTokenData] = useState<{ email: string } | null>(null);

  useEffect(() => {
    if (invitationToken) {
      const data = verifyInvitationToken(invitationToken);
      setTokenData(data);
    }
  }, [invitationToken]);

  // Verify invitation token
  if (!invitationToken) {
    // No invitation - redirect to home or show error
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Invitation Required</h1>
          <p className="text-lg text-muted-foreground mb-8">
            You need an invitation to create an account. Please contact your administrator.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors text-foreground font-medium inline-block"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  // Verify the token is valid
  if (tokenData === null) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!tokenData) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Invalid or Expired Invitation</h1>
          <p className="text-lg text-muted-foreground mb-8">
            This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors text-foreground font-medium inline-block"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Create Your Account</h1>
          <p className="text-muted-foreground">
            Please sign up with the email: <strong>{tokenData.email}</strong>
          </p>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: isLightMode ? "#ffffff" : "#0c0a09",
              colorText: isLightMode ? "#171717" : "#f5f5f5",
              colorInputBackground: isLightMode ? "#f5f5f5" : "#1c1917",
              colorInputText: isLightMode ? "#171717" : "#e5e5e5",
            },
            elements: {
              card: isLightMode ? "bg-white border border-gray-200" : "bg-gray-900/80 border border-gray-800/50",
              headerTitle: isLightMode ? "text-gray-900" : "text-gray-100",
              headerSubtitle: isLightMode ? "text-gray-600" : "text-gray-400",
              formButtonPrimary: "bg-blue-500 hover:bg-blue-600",
              footerActionLink: "text-blue-500 hover:text-blue-600",
            },
          }}
          forceRedirectUrl={getClientsUrl()}
          fallbackRedirectUrl={getClientsUrl()}
          signInUrl="/sign-in"
          routing="path"
          path="/sign-up"
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/sign-in" className="text-blue-400 hover:text-blue-400">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    }>
      <SignUpContent />
    </Suspense>
  );
}
