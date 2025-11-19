import { Clock, CheckCircle2, Zap } from "lucide-react";

export function WhatWeDo() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-foreground text-center mb-6 text-3xl md:text-5xl">
          What We Do
        </h2>
        <p className="text-xl md:text-2xl text-muted-foreground text-center mb-16 max-w-3xl mx-auto">
          We take the boring, repetitive tasks that eat up your day and make them happen automatically.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-secondary p-8 rounded-xl border border-border text-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-foreground mb-4 text-2xl">Save Time</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Stop spending hours on data entry, scheduling, and paperwork. Our system does it in seconds.
            </p>
          </div>
          
          <div className="bg-secondary p-8 rounded-xl border border-border text-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-foreground mb-4 text-2xl">Fewer Mistakes</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Humans make mistakes when doing the same thing repeatedly. Our systems don't.
            </p>
          </div>
          
          <div className="bg-secondary p-8 rounded-xl border border-border text-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-foreground mb-4 text-2xl">Always Working</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Our systems work 24/7—even when you're sleeping, on weekends, and during holidays.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
