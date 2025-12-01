import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Vercatryx account to access your business dashboard, manage clients, and streamline your operations.",
  openGraph: {
    title: "Sign In | Vercatryx",
    description: "Sign in to your Vercatryx account to access your business dashboard.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sign In | Vercatryx",
    description: "Sign in to your Vercatryx account to access your business dashboard.",
  },
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com'}/sign-in`,
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
