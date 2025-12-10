"use client";

import { Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const handleContactCtaClick = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'contact_cta_click');
    }
  };

  return (
    <footer className="bg-[#0f1115] text-[#9ca3af] py-12 px-4 sm:px-6 lg:px-8 border-t border-[rgba(255,255,255,0.04)] transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo-big.svg" alt="Vercatryx" width={100} height={100} />
            </div>
            <p className="text-lg leading-[1.5] max-w-md">
              We take care of your repetitive work so you can focus on what really matters.
            </p>
          </div>
          
          <div>
            <h4 className="text-[#f9fafb] mb-4 text-xl font-semibold">Get In Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#ff3b30]" />
                <span className="text-lg">info@vercatryx.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#ff3b30]" />
                <Link href="/contact" onClick={handleContactCtaClick}>
                  <span className="text-lg hover:underline">Schedule a Call</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-[rgba(255,255,255,0.04)] text-center mb-8">
          <Link 
            href="/contact" 
            onClick={handleContactCtaClick}
            className="px-7 py-[14px] bg-[#ff3b30] text-white rounded-[10px] font-semibold text-lg hover:bg-[#ff3b30]/90 transition-colors inline-flex items-center justify-center"
            aria-label="Schedule a Meeting"
          >
            Schedule a Meeting
          </Link>
        </div>
        
        <div className="pt-8 border-t border-[rgba(255,255,255,0.04)] text-center">
          <p>&copy; 2025 vercatryx. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
