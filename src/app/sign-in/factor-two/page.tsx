"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LogoWineFill from "@/components/loading";
import { getClientsPath } from "@/lib/clients-url";

export default function FactorTwoPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Once user is signed in (2FA completed), redirect to clients page
    if (isLoaded && isSignedIn) {
      router.push(getClientsPath());
    }
  }, [isLoaded, isSignedIn, router]);

  // Always show loading icon while processing 2FA or redirecting
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="text-center">
        <LogoWineFill
          width={300}
          duration={10}
        />
        <p className="mt-6 text-muted-foreground text-lg">
          {!isLoaded ? "Verifying..." : isSignedIn ? "Loading your workspace..." : "Verifying your code..."}
        </p>
      </div>
    </main>
  );
}

