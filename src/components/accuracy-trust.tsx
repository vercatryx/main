export function AccuracyTrust() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#171718] border-t border-b border-[rgba(255,255,255,0.04)]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-[#f9fafb] text-center mb-8 text-4xl md:text-5xl lg:text-6xl font-bold">
          Accuracy You Can Trust
        </h2>
        
        <p className="text-xl md:text-2xl leading-[1.5] text-[#9ca3af] text-center mb-16 max-w-4xl mx-auto">
          AI can be powerful—but sometimes it gets things wrong. We built our system to avoid that.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start mb-10">
          <div className="bg-[#0f1115] rounded-xl p-10 border border-[rgba(255,255,255,0.04)]">
            <p className="text-xl leading-[1.5] text-[#f9fafb]">
              Our hybrid approach: AI handles the workload immediately. When confidence on a specific item drops below our threshold, the system routes that single item to a human for a fast verification. Only that item is held up — the rest continues automatically. This preserves speed while ensuring accuracy.
            </p>
          </div>
          
          <div className="bg-[#0f1115] rounded-xl p-10 border border-[rgba(255,255,255,0.04)]">
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">AI completes ~99% of tasks automatically.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Low-confidence items are queued for quick human review.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Human checks are concise and localized — they take seconds.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Processing resumes immediately after verification.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-10">
          <div className="bg-[#0f1115] rounded-xl p-8 border border-[rgba(255,255,255,0.04)] max-w-[320px] w-full md:max-w-none">
            <div className="flex items-center justify-center gap-4 text-[#f9fafb] text-2xl">
              <span className="font-semibold">AI</span>
              <span className="text-[#ff3b30] text-3xl">→</span>
              <span className="font-semibold">Human</span>
              <span className="text-[#ff3b30] text-3xl">→</span>
              <span className="font-semibold">Confirm</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl md:text-2xl leading-[1.5] text-[#f9fafb] max-w-4xl mx-auto">
            The result: near-perfect accuracy with none of the slowdowns.
          </p>
        </div>
      </div>
    </section>
  );
}

