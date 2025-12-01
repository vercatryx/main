import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Vercatryx account by invitation. Join our platform to streamline your business operations and manage clients efficiently.",
  openGraph: {
    title: "Sign Up | Vercatryx",
    description: "Create your Vercatryx account by invitation.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sign Up | Vercatryx",
    description: "Create your Vercatryx account by invitation.",
  },
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com'}/sign-up`,
  },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
