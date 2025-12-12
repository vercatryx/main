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
          Replace Full-Time Back-Office Work With AI
          <br />
          <span className="text-red-500">—At a Fraction of the Cost</span>
        </h1>
        
        <p className="text-2xl md:text-3xl text-muted-foreground mb-6 leading-relaxed max-w-3xl mx-auto">
          Most companies don't realize they're paying people to do tasks AI can complete instantly.
        </p>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
          Let us show you how to eliminate 50–90% of back-office workload—without hiring, training, or managing staff.
        </p>
        
        <p className="text-2xl md:text-3xl text-foreground mb-12 font-semibold">
          Give us 10 minutes. The savings will shock you.
        </p>
        
        <Link href="/contact" className="px-10 py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xl flex items-center justify-center gap-3 mx-auto">
          Talk to Us
          <ArrowRight className="w-6 h-6" />
        </Link>
      </div>
    </section>
  );
}
