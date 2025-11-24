"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { verifyInvitationToken } from "@/lib/invitations";
import { useTheme } from "@/contexts/theme-context";
import AnimatedLogo from "@/components/AnimatedLogo";

function SignUpContent() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const [tokenData, setTokenData] = useState<{ email: string } | null>(null);
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const clerkContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invitationToken) {
      const data = verifyInvitationToken(invitationToken);
      setTokenData(data);
    }
  }, [invitationToken]);

  // Detect when Clerk component has rendered
  useEffect(() => {
    if (!tokenData?.email) return;

    let observer: MutationObserver | null = null;
    const timeouts: NodeJS.Timeout[] = [];

    const checkClerkLoaded = () => {
      // Check for Clerk's specific elements - look for Clerk's form or input fields
      const container = clerkContainerRef.current;
      if (!container) return false;

      // Check for Clerk's form elements within the container
      const clerkForm = container.querySelector('form') || 
                        container.querySelector('input[type="email"]') ||
                        container.querySelector('[class*="clerk"]') ||
                        container.querySelector('[data-clerk-element]') ||
                        container.querySelector('button[type="submit"]');
      
      if (clerkForm) {
        setClerkLoaded(true);
        return true;
      }
      return false;
    };

    // Wait a bit for the ref to be set, then start checking
    const initTimeout = setTimeout(() => {
      if (!clerkContainerRef.current) return;

      // Use MutationObserver to watch for Clerk's dynamic rendering within the container
      observer = new MutationObserver(() => {
        checkClerkLoaded();
      });

      // Start observing the container for changes
      observer.observe(clerkContainerRef.current, {
        childList: true,
        subtree: true,
      });

      // Also try after short delays to catch any delayed rendering
      timeouts.push(setTimeout(checkClerkLoaded, 100));
      timeouts.push(setTimeout(checkClerkLoaded, 500));
      timeouts.push(setTimeout(checkClerkLoaded, 1000));
      timeouts.push(setTimeout(checkClerkLoaded, 2000));
    }, 50);

    return () => {
      clearTimeout(initTimeout);
      if (observer) {
        observer.disconnect();
      }
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [tokenData?.email]);

  // Lock the email field to prevent editing
  useEffect(() => {
    if (!tokenData?.email) return;

    const lockEmailField = () => {
      // Find the email input field in Clerk's form
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      if (emailInput && !emailInput.readOnly) {
        emailInput.readOnly = true;
        emailInput.style.cursor = 'not-allowed';
        emailInput.style.opacity = '0.7';
        emailInput.setAttribute('aria-readonly', 'true');
      }
    };

    // Try immediately
    lockEmailField();

    // Use MutationObserver to watch for Clerk's dynamic form rendering
    const observer = new MutationObserver(() => {
      lockEmailField();
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also try after short delays to catch any delayed rendering
    const timeout1 = setTimeout(lockEmailField, 100);
    const timeout2 = setTimeout(lockEmailField, 500);
    const timeout3 = setTimeout(lockEmailField, 1000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [tokenData?.email]);

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

        <div ref={clerkContainerRef} className="relative min-h-[400px]">
          {!clerkLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <AnimatedLogo
                  width="200px"
                  height="200px"
                  speed={5}
                />
              </div>
            </div>
          )}
          <div className={`transition-opacity duration-300 ${clerkLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <SignUp
              initialValues={{
                emailAddress: tokenData.email,
              }}
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
                  header: { display: "none" },
                  formButtonPrimary: "bg-blue-500 hover:bg-blue-600",
                  footer: { display: "none" },
                },
              }}
              forceRedirectUrl="/clients"
              fallbackRedirectUrl="/clients"
              signInUrl="/sign-in"
              routing="path"
              path="/sign-up"
            />
          </div>
        </div>

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
