import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-5xl mx-auto text-center">
        <div className="flex justify-center mb-12">
          <Image src="/logo-big-white.svg" alt="Vercatryx" width={600} height={600} className="w-full max-w-2xl h-auto" priority />
        </div>
        
        <h1 className="text-foreground mb-8 text-4xl md:text-6xl">
          We Handle Your Repetitive Work
          <br />
          So You Don't Have To
        </h1>
        
        <p className="text-2xl md:text-3xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
          Tired of doing the same tasks over and over? We build smart systems that do them for you—automatically.
        </p>
        
        <Link href="/contact" className="px-10 py-4 bg-red-500 text-white rounded-lg hover:bg-red-500 transition-colors text-xl flex items-center justify-center gap-3 mx-auto">
          Talk to Us
          <ArrowRight className="w-6 h-6" />
        </Link>
      </div>
    </section>
  );
}
