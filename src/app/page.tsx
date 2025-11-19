import { Hero } from "@/components/hero";
import { WhatWeDo } from "@/components/what-we-do";
import { HowItWorks } from "@/components/how-it-works";
import { CrmSection } from "@/components/crm-section";
import { WhoItsFor } from "@/components/who-its-for";
import { GetStarted } from "@/components/get-started";
import { Footer } from "@/components/footer";
import { Navigation } from "@/components/navigation";

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
