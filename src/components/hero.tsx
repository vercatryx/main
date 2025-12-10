"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  const handleHeroCtaClick = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'hero_cta_click');
    }
  };

  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-[#0f1115]">
      <div className="max-w-5xl mx-auto text-center">
        <div className="flex justify-center mb-12">
          <Image src="/logo-big-white.svg" alt="Vercatryx" width={600} height={600} className="w-full max-w-2xl h-auto" priority />
        </div>
        
        <h1 className="text-[#f9fafb] mb-8 text-[28px] leading-tight sm:text-[40px] md:text-[56px] font-bold">
          Replace Full-Time Back-Office Work With AI—At a Fraction of the Cost
        </h1>
        
        <p className="text-xl md:text-2xl leading-[1.5] text-[#9ca3af] mb-8 max-w-4xl mx-auto">
          Most companies don't realize they're paying people to do tasks AI can complete instantly. Let us show you how to eliminate 50–90% of repetitive workload—without hiring, training, or managing staff.
        </p>
        
        <div className="flex items-center justify-center mb-4">
          <Link 
            href="/contact" 
            onClick={handleHeroCtaClick}
            className="px-7 py-[14px] bg-[#ff3b30] text-white rounded-[10px] font-semibold text-lg hover:bg-[#ff3b30]/90 transition-colors flex items-center justify-center gap-3"
            aria-label="Give Us 10 Minutes — We Will Save You Thousands — Schedule a Meeting"
          >
            Give Us 10 Minutes — We Will Save You Thousands — Schedule a Meeting
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
