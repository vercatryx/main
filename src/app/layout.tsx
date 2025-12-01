import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { ThemeProvider } from "@/contexts/theme-context";
import "@/styles/globals.css";
import { ThemeRegistry } from "@/components/theme-registry";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Vercatryx | Business Solutions & CRM Platform",
    template: "%s | Vercatryx",
  },
  description: "Transform your business with Vercatryx's comprehensive CRM platform. Streamline operations, manage clients, and grow your business with our powerful tools.",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com'),
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Vercatryx',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vercatryx',
    url: baseUrl,
    logo: `${baseUrl}/logo-big.png`,
    description: 'Transform your business with Vercatryx\'s comprehensive CRM platform. Streamline operations, manage clients, and grow your business with our powerful tools.',
    sameAs: [],
  };

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      <html lang="en" suppressHydrationWarning>
        <body>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    // Default to dark mode until theme is determined
                    const savedTheme = localStorage.getItem('theme');
                    const theme = savedTheme && ['light', 'dark'].includes(savedTheme) ? savedTheme : 'dark';

                    // Apply dark mode immediately to prevent flash
                    if (theme === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }

                    // Set dark background on body immediately
                    document.documentElement.style.backgroundColor = theme === 'dark' ? '#171717' : '#ffffff';
                  } catch (e) {
                    // Fallback to dark mode if localStorage fails
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.backgroundColor = '#171717';
                  }
                })();
              `,
            }}
          />
          <ThemeRegistry />
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
