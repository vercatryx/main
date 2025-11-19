"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoWineFill from "@/components/loading";

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If user is already signed in when page loads, redirect immediately
    if (isLoaded && isSignedIn) {
      setShowLoader(true);
      router.push("/clients");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loader when user is signed in (Clerk modal has closed)
  if (isLoaded && isSignedIn) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <LogoWineFill
            width={300}
            duration={10}
            color="#ff0000"
            baseColor="#555555"
            outlineColor="#ffffff"
          />
          <p className="mt-6 text-gray-400 text-lg">Loading your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="flex justify-center mb-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Logo - Clickable Home Button */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/logo-big-white.svg"
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
              colorBackground: "#0c0a09",
              colorText: "#f5f5f5",
              colorInputBackground: "#1c1917",
              colorInputText: "#e5e5e5",
            },
            elements: {
              card: "bg-gray-900 border border-gray-700",
              headerTitle: "text-gray-100",
              headerSubtitle: "text-gray-400",
              formButtonPrimary: "bg-red-600 hover:bg-red-700",
              footerActionLink: "text-red-400 hover:text-red-300",
            },
          }}
          redirectUrl="/clients"
          fallbackRedirectUrl="/clients"
        />

        {/* Not a Client Yet */}
        <div className="mt-8 text-center p-6 bg-gray-900 border border-gray-700 rounded-lg">
          <p className="text-gray-300 mb-2 font-medium">Not a client yet?</p>
          <p className="text-sm text-gray-400 mb-4">
            Learn more about our solutions—or reach out to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white font-medium border border-gray-600"
            >
              <Home className="w-4 h-4" />
              Learn More About Us
            </Link>
            <Link
              href="/contact"
              className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white font-medium"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
