import { Clock, CheckCircle2, Zap } from "lucide-react";

export function WhatWeDo() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#171718] border-t border-b border-[rgba(255,255,255,0.04)]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-[#f9fafb] text-center mb-8 text-4xl md:text-5xl lg:text-6xl font-bold">
          What We Do
        </h2>
        <p className="text-xl md:text-2xl leading-[1.5] text-[#9ca3af] text-center mb-20 max-w-4xl mx-auto">
          We design automation that performs the work your staff does every day—faster, flawlessly, and around the clock.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="bg-[#0f1115] p-10 rounded-xl border border-[rgba(255,255,255,0.04)] text-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Clock className="w-16 h-16 text-[#ff3b30]" />
            </div>
            <h3 className="text-[#f9fafb] mb-6 text-3xl font-semibold">Cut Labor Costs Dramatically</h3>
            <p className="text-[#9ca3af] text-xl leading-[1.5]">
              One automated system can replace the equivalent of multiple full-time employees.
            </p>
          </div>
          
          <div className="bg-[#0f1115] p-10 rounded-xl border border-[rgba(255,255,255,0.04)] text-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-16 h-16 text-[#ff3b30]" />
            </div>
            <h3 className="text-[#f9fafb] mb-6 text-3xl font-semibold">Accuracy That Humans Can't Match</h3>
            <p className="text-[#9ca3af] text-xl leading-[1.5]">
              Repetitive tasks become instant, consistent, and error-free.
            </p>
          </div>
          
          <div className="bg-[#0f1115] p-10 rounded-xl border border-[rgba(255,255,255,0.04)] text-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Zap className="w-16 h-16 text-[#ff3b30]" />
            </div>
            <h3 className="text-[#f9fafb] mb-6 text-3xl font-semibold">Always On—Never Slowing Down</h3>
            <p className="text-[#9ca3af] text-xl leading-[1.5]">
              Your operations run continuously without overtime, turnover, or added payroll.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
