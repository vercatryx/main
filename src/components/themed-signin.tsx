"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "@/contexts/theme-context";

interface ThemedSignInProps {
  path?: string;
  redirectUrl?: string;
  fallbackRedirectUrl?: string;
}

export function ThemedSignIn({ path, redirectUrl, fallbackRedirectUrl }: ThemedSignInProps) {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';

  return (
    <SignIn
      path={path}
      redirectUrl={redirectUrl}
      fallbackRedirectUrl={fallbackRedirectUrl}
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
          footer: "hidden",
        },
      }}
    />
  );
}

