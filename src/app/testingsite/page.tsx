import { Hero } from "@/components/hero";
import { WhatWeDo } from "@/components/what-we-do";
import { AccuracyTrust } from "@/components/accuracy-trust";
import { HowItWorks } from "@/components/how-it-works";
import { CrmSection } from "@/components/crm-section";
import { WhoItsFor } from "@/components/who-its-for";
import { GetStarted } from "@/components/get-started";
import { Footer } from "@/components/footer";
import { Navigation } from "@/components/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Replace Full-Time Back-Office Work With AI | Vercatryx",
  description: "Most companies don't realize they're paying people to do tasks AI can complete instantly. Let us show you how to eliminate 50–90% of repetitive workload—without hiring, training, or managing staff.",
  keywords: ["AI automation", "back-office automation", "labor cost reduction", "business automation", "workflow automation", "AI replacement", "cost savings", "Vercatryx"],
  authors: [{ name: "Vercatryx" }],
  openGraph: {
    title: "Replace Full-Time Back-Office Work With AI | Vercatryx",
    description: "Most companies don't realize they're paying people to do tasks AI can complete instantly. Let us show you how to eliminate 50–90% of repetitive workload—without hiring, training, or managing staff.",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com',
    siteName: "Vercatryx",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Replace Full-Time Back-Office Work With AI | Vercatryx",
    description: "Most companies don't realize they're paying people to do tasks AI can complete instantly. Let us show you how to eliminate 50–90% of repetitive workload—without hiring, training, or managing staff.",
  },
  robots: "index, follow",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com',
  },
};

export default function TestingSite() {
  return (
    <div className="min-h-screen bg-[#0f1115] transition-colors">
      <Navigation />
      <Hero />
      <WhatWeDo />
      <AccuracyTrust />
      <HowItWorks />
      <CrmSection />
      <WhoItsFor />
      <GetStarted />
      <Footer />
    </div>
  );
}


