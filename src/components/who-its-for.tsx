import { Building2, Heart, Briefcase, Home } from "lucide-react";

const industries = [
  {
    icon: Heart,
    name: "Healthcare",
    description: "Clinics, billing services, dental practices"
  },
  {
    icon: Briefcase,
    name: "Professional Services",
    description: "Law firms, accountants, consultancies"
  },
  {
    icon: Building2,
    name: "Business Services",
    description: "Property management, logistics"
  },
  {
    icon: Home,
    name: "Any Business",
    description: "If your team spends time on repetitive back-office work, we replace it."
  }
];

export function WhoItsFor() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0f1115] border-t border-b border-[rgba(255,255,255,0.04)]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-[#f9fafb] text-center mb-8 text-4xl md:text-5xl lg:text-6xl font-bold">
          Who We Serve
        </h2>
        <p className="text-xl md:text-2xl leading-[1.5] text-[#9ca3af] text-center mb-20">
          Businesses drowning in paperwork or repetitive tasks—especially:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {industries.map((industry, index) => (
            <div key={index} className="bg-[#171718] p-10 rounded-xl border border-[rgba(255,255,255,0.04)]">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <industry.icon className="w-9 h-9 text-[#ff3b30]" />
                </div>
                <div>
                  <h3 className="text-[#f9fafb] text-2xl mb-3 font-semibold">{industry.name}</h3>
                  <p className="text-xl leading-[1.5] text-[#f9fafb]">{industry.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
