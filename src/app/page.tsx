import { Hero } from "@/components/hero";
import { WhatWeDo } from "@/components/what-we-do";
import { HowItWorks } from "@/components/how-it-works";
import { CrmSection } from "@/components/crm-section";
import { WhoItsFor } from "@/components/who-its-for";
import { GetStarted } from "@/components/get-started";
import { Footer } from "@/components/footer";
import { Navigation } from "@/components/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vercatryx | Modern Business Solutions & CRM Platform",
  description: "Transform your business with Vercatryx's comprehensive CRM platform. Streamline operations, manage clients, and grow your business with our powerful tools.",
  keywords: ["CRM", "business solutions", "client management", "business platform", "productivity tools", "Vercatryx"],
  authors: [{ name: "Vercatryx" }],
  openGraph: {
    title: "Vercatryx | Modern Business Solutions & CRM Platform",
    description: "Transform your business with Vercatryx's comprehensive CRM platform. Streamline operations, manage clients, and grow your business with our powerful tools.",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com',
    siteName: "Vercatryx",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vercatryx | Modern Business Solutions & CRM Platform",
    description: "Transform your business with Vercatryx's comprehensive CRM platform. Streamline operations, manage clients, and grow your business with our powerful tools.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <Navigation />
      <Hero />
      <WhatWeDo />
      <HowItWorks />
      <CrmSection />
      <WhoItsFor />
      <GetStarted />
      <Footer />
    </div>
  );
}
