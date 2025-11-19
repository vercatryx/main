import { Building2, Heart, Briefcase, Home } from "lucide-react";

const industries = [
  {
    icon: Heart,
    name: "Healthcare",
    description: "Doctors' offices, dental practices, clinics, and medical billing companies"
  },
  {
    icon: Briefcase,
    name: "Professional Services",
    description: "Law firms, accounting offices, consulting agencies, and insurance companies"
  },
  {
    icon: Building2,
    name: "Business Services",
    description: "Property management, logistics companies, and corporate offices"
  },
  {
    icon: Home,
    name: "Any Business",
    description: "If you have repetitive tasks that take up your team's time, we can help"
  }
];

export function WhoItsFor() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-foreground text-center mb-6 text-3xl md:text-5xl">
          Who Is This For?
        </h2>
        <p className="text-xl md:text-2xl text-muted-foreground text-center mb-16">
          We help businesses in all industries, but especially those with lots of paperwork and routine tasks.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {industries.map((industry, index) => (
            <div key={index} className="bg-card p-8 rounded-xl border border-border">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <industry.icon className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <h3 className="text-foreground text-xl mb-2">{industry.name}</h3>
                  <p className="text-foreground text-lg">{industry.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
