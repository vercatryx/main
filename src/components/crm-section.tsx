import { Database, Plug } from "lucide-react";

export function CrmSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#171718] border-t border-b border-[rgba(255,255,255,0.04)]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-[#f9fafb] text-center mb-8 text-4xl md:text-5xl lg:text-6xl font-bold">
          Your Operations, Completely Streamlined
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div className="bg-[#0f1115] p-10 md:p-12 rounded-xl border border-[rgba(255,255,255,0.04)]">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-8">
              <Database className="w-10 h-10 text-[#ff3b30]" />
            </div>
            <h3 className="text-[#f9fafb] mb-6 text-3xl font-semibold">We Build Custom Systems</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Centralized records for customers and tasks</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Document management and searchable archives</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Workflow automation and dashboards</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#0f1115] p-10 md:p-12 rounded-xl border border-[rgba(255,255,255,0.04)]">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-8">
              <Plug className="w-10 h-10 text-[#ff3b30]" />
            </div>
            <h3 className="text-[#f9fafb] mb-6 text-3xl font-semibold">We Integrate With What You Have</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Connectors to existing software and EMRs</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">No user retraining required</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 bg-[#ff3b30] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl leading-[1.5] text-[#f9fafb]">Automatic syncing and legacy support</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#0f1115] p-10 rounded-xl border border-[rgba(255,255,255,0.04)] text-center">
          <p className="text-xl md:text-2xl leading-[1.5] text-[#f9fafb] max-w-4xl mx-auto">
            You keep your process. We make it operate automatically.
          </p>
        </div>
      </div>
    </section>
  );
}
