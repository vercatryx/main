import { Bot, Database, MessageSquare, Link2 } from "lucide-react";

const services = [
  {
    icon: Bot,
    title: "AI Agents",
    description: "Advanced AI systems that automate billing workflows, claims processing, insurance verification, data entry, document extraction, payment posting, scheduling, intake, onboarding, compliance reporting, and quality assurance checks."
  },
  {
    icon: Database,
    title: "Custom CRM Platforms",
    description: "Tailored CRM systems that serve as the central hub for all your data. Coordinate information, track tasks, and maintain organized records—all designed around your specific workflow needs."
  },
  {
    icon: MessageSquare,
    title: "AI Communication Tools",
    description: "Intelligent systems that call, text, and email clients or patients automatically. Collect information, confirm appointments, request documents, and support ongoing workflows without human intervention."
  },
  {
    icon: Link2,
    title: "Legacy System Integration",
    description: "Seamlessly connect older tools to modern workflows. We normalize records, migrate information, and integrate with existing systems to create a unified, intelligent platform."
  }
];

export function Services() {
  return (
    <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-foreground mb-4">
            Complete Automation Solutions
          </h2>
          <p className="text-xl text-muted-foreground">
            From AI agents to CRM platforms, we provide everything you need to automate 
            complex workflows and eliminate manual processes.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="p-8 bg-card rounded-2xl hover:shadow-lg hover:shadow-red-500/20 transition-all border border-border"
            >
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
                <service.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-foreground mb-3">{service.title}</h3>
              <p className="text-foreground leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
