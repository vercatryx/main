export function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0f1115] border-t border-b border-[rgba(255,255,255,0.04)]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-[#f9fafb] text-center mb-8 text-4xl md:text-5xl lg:text-6xl font-bold">
          Work We Commonly Replace
        </h2>
        <p className="text-xl md:text-2xl leading-[1.5] text-[#9ca3af] text-center mb-20">
          Nearly any structured, repeatable process can be automated.
        </p>
        
        <div className="bg-[#171718] rounded-2xl p-10 md:p-16 border border-[rgba(255,255,255,0.04)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Billing, insurance claims, prior authorizations <span className="text-[#9ca3af]">(reduces processing time and errors)</span></p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Eligibility checks and benefits verification <span className="text-[#9ca3af]">(faster approvals)</span></p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Payment posting, reconciliation, AR follow-up <span className="text-[#9ca3af]">(reduces aging balances)</span></p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Data entry, document parsing, record updates <span className="text-[#9ca3af]">(instant updates)</span></p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Intake forms, onboarding, document collection <span className="text-[#9ca3af]">(automated ingestion)</span></p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Scheduling, reminders, and rescheduling <span className="text-[#9ca3af]">(fewer no-shows)</span></p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Compliance reporting and audit prep <span className="text-[#9ca3af]">(organized, auditable logs)</span></p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Customer communication: calling, texting, emailing <span className="text-[#9ca3af]">(consistent follow-up)</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}