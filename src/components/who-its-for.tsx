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
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-white text-center mb-6 text-3xl md:text-5xl">
          Who Is This For?
        </h2>
        <p className="text-xl md:text-2xl text-gray-300 text-center mb-16">
          We help businesses in all industries, but especially those with lots of paperwork and routine tasks.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {industries.map((industry, index) => (
            <div key={index} className="bg-black p-8 rounded-xl border border-gray-800">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <industry.icon className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <h3 className="text-white text-xl mb-2">{industry.name}</h3>
                  <p className="text-gray-300 text-lg">{industry.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
