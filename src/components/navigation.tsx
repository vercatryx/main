"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Navigation() {
  const handleContactCtaClick = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'contact_cta_click');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1115]/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.04)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Image src="/logo-small-white.svg" alt="Vercatryx" width={40} height={40} />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/clients" className="text-[#f9fafb] hover:text-[#9ca3af] transition-colors text-lg">
              Clients
            </Link>
            <Link 
              href="/contact" 
              onClick={handleContactCtaClick}
              className="px-4 py-2 bg-[#ff3b30] text-white rounded-lg font-semibold text-base hover:bg-[#ff3b30]/90 transition-colors"
              aria-label="Schedule a Meeting"
            >
              Schedule a Meeting
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
