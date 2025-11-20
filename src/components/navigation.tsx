"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Image src="/logo-small-white.svg" alt="Vercatryx" width={40} height={40} />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/clients" className="text-foreground hover:text-muted-foreground transition-colors text-lg">
              Clients
            </Link>
            <Link href="/contact" className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-500 transition-colors text-lg">
              Contact Us
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
