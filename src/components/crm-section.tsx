import { Database, Plug } from "lucide-react";

export function CrmSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-secondary">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-foreground text-center mb-6 text-3xl md:text-5xl">
          We Also Keep Everything Organized
        </h2>
        <p className="text-xl md:text-2xl text-muted-foreground text-center mb-16 max-w-3xl mx-auto">
          All your information in one place—no more searching through emails, spreadsheets, and sticky notes.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card p-8 md:p-10 rounded-xl border border-border">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <Database className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-foreground mb-4 text-2xl">We Build Custom Systems</h3>
            <p className="text-foreground text-lg leading-relaxed mb-6">
              If you don't have a system to track everything, we'll build one for you. 
              Think of it as a central filing cabinet where all your information lives—customer records, 
              appointments, documents, payments, everything.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">Track all customer or patient information</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">See the status of tasks and appointments</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">Store and organize all your documents</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">Built specifically for how your business works</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card p-8 md:p-10 rounded-xl border border-border">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <Plug className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-foreground mb-4 text-2xl">We Connect to What You Have</h3>
            <p className="text-foreground text-lg leading-relaxed mb-6">
              Already using software to manage your business? No problem. 
              We connect our automation to your existing systems so everything works together. 
              No need to change how you work or learn new software.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">Works with your current software</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">No disruption to your daily operations</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">Sync data automatically between systems</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">Connects even with older, legacy programs</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-10 bg-card p-8 rounded-xl border border-border text-center">
          <p className="text-foreground text-lg leading-relaxed max-w-3xl mx-auto">
            <span className="font-semibold">Bottom line:</span> Whether we build you a new system or connect to what you're using now, 
            all your data stays organized and our automation knows exactly where to find and put information.
          </p>
        </div>
      </div>
    </section>
  );
}
