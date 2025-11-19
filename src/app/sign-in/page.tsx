"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Home } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LogoWineFill from "@/components/loading";
import { useTheme } from "@/contexts/theme-context";

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { theme } = useTheme();
  const isLightMode = theme === 'light';

  useEffect(() => {
    // If user is already signed in when page loads, redirect immediately
    if (isLoaded && isSignedIn) {
      router.push("/clients");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loader while Clerk is loading or when user is signed in (Clerk modal has closed)
  if (!isLoaded || (isLoaded && isSignedIn)) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center">
          <LogoWineFill
            width={300}
            duration={10}
          />
          <p className="mt-6 text-muted-foreground text-lg">
            {!isLoaded ? "Loading..." : "Loading your workspace..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="flex justify-center mb-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Logo - Clickable Home Button */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src={isLightMode ? "/logo-big.svg" : "/logo-big-white.svg"}
              alt="Vercatryx"
              width={200}
              height={60}
              priority
              className="h-16 w-auto"
            />
          </Link>
        </div>

        {/* Sign In Form */}
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#dc2626",
              colorBackground: isLightMode ? "#ffffff" : "#0c0a09",
              colorText: isLightMode ? "#171717" : "#f5f5f5",
              colorInputBackground: isLightMode ? "#f5f5f5" : "#1c1917",
              colorInputText: isLightMode ? "#171717" : "#e5e5e5",
            },
            elements: {
              card: isLightMode ? "bg-white border border-gray-200" : "bg-gray-900 border border-gray-700",
              headerTitle: isLightMode ? "text-gray-900" : "text-gray-100",
              headerSubtitle: isLightMode ? "text-gray-600" : "text-gray-400",
              formButtonPrimary: "bg-red-500 hover:bg-red-600",
              footerActionLink: "text-red-500 hover:text-red-600",
            },
          }}
          redirectUrl="/clients"
          fallbackRedirectUrl="/clients"
        />

        {/* Not a Client Yet */}
        <div className="mt-8 text-center p-6 bg-card border border-border rounded-lg">
          <p className="text-foreground mb-2 font-medium">Not a client yet?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Learn more about our solutions—or reach out to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-foreground font-medium border border-border"
            >
              <Home className="w-4 h-4" />
              Learn More About Us
            </Link>
            <Link
              href="/contact"
              className="inline-block px-6 py-2 bg-red-500 hover:bg-red-500 rounded-lg transition-colors text-foreground font-medium"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
