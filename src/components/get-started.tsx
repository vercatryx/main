"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function GetStarted() {
  const handleContactCtaClick = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'contact_cta_click');
    }
  };

  return (
    <section id="savings" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#171718] border-t border-b border-[rgba(255,255,255,0.04)]">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-[#f9fafb] mb-8 text-4xl md:text-5xl lg:text-6xl font-bold">
          See How Much You Can Save
        </h2>
        
        <p className="text-xl md:text-2xl leading-[1.5] text-[#9ca3af] mb-16">
          Our consultation is simple and fast. We identify automation, estimate savings, and deliver a plan.
        </p>
        
        <div className="bg-[#0f1115] rounded-2xl p-10 md:p-16 border border-[rgba(255,255,255,0.04)]">
          <div className="space-y-6 text-left max-w-3xl mx-auto mb-12">
            <div className="flex gap-5">
              <div className="w-12 h-12 bg-[#ff3b30] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xl">
                1
              </div>
              <div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">
                  You show us what your team is doing.
                </p>
                <p className="text-xl leading-[1.5] text-[#9ca3af] mt-2">
                  Tell us the repetitive tasks that take up time every week.
                </p>
              </div>
            </div>
            
            <div className="flex gap-5">
              <div className="w-12 h-12 bg-[#ff3b30] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xl">
                2
              </div>
              <div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">
                  We map the automation.
                </p>
                <p className="text-xl leading-[1.5] text-[#9ca3af] mt-2">
                  We show you exactly which parts AI can take over — and how much time and money it will save you.
                </p>
              </div>
            </div>
            
            <div className="flex gap-5">
              <div className="w-12 h-12 bg-[#ff3b30] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xl">
                3
              </div>
              <div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">
                  We build your system.
                </p>
                <p className="text-xl leading-[1.5] text-[#9ca3af] mt-2">
                  You get a custom automation designed around your exact workflow.
                </p>
              </div>
            </div>
            
            <div className="flex gap-5">
              <div className="w-12 h-12 bg-[#ff3b30] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xl">
                4
              </div>
              <div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">
                  You enjoy the results.
                </p>
                <p className="text-xl leading-[1.5] text-[#9ca3af] mt-2">
                  The work starts completing itself — instantly, accurately, and without staff effort.
                </p>
              </div>
            </div>
          </div>
          
          <Link 
            href="/contact" 
            onClick={handleContactCtaClick}
            className="px-7 py-[14px] bg-[#ff3b30] text-white rounded-[10px] font-semibold text-lg hover:bg-[#ff3b30]/90 transition-colors flex items-center justify-center gap-3 mx-auto"
            aria-label="Schedule a Meeting"
          >
            Schedule a Meeting
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
