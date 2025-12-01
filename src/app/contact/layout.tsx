import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Vercatryx. Let's discuss how we can automate your repetitive tasks and save you time. Fill out our contact form or check if someone is available now.",
  openGraph: {
    title: "Contact Us | Vercatryx",
    description: "Get in touch with Vercatryx. Let's discuss how we can automate your repetitive tasks and save you time.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact Us | Vercatryx",
    description: "Get in touch with Vercatryx. Let's discuss how we can automate your repetitive tasks and save you time.",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com'}/contact`,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
