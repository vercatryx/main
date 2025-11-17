import { Check } from "lucide-react";

const useCases = [
  "Billing, claims submission, and prior authorizations",
  "Insurance eligibility checks and benefit retrieval",
  "Data entry, document scanning, and information extraction",
  "Payment posting, reconciliation, and aging follow-ups",
  "Appointment scheduling, reminders, and rescheduling",
  "Intake forms, onboarding, and document collection",
  "Compliance reporting and audit preparation",
  "Inventory tracking and restock workflows",
  "Customer and patient communication via voice, text, and email",
  "Quality checks, error detection, and rule-based decision trees"
];

const industries = [
  "Healthcare",
  "Finance",
  "Insurance",
  "Logistics",
  "Real Estate",
  "Manufacturing"
];

export function UseCases() {
  return (
    <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 bg-black dark:bg-black transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-white dark:text-white mb-4">
            What We Automate
          </h2>
          <p className="text-xl text-gray-300 dark:text-gray-300">
            Our AI agents handle a wide range of tasks across multiple industries, 
            streamlining operations and eliminating manual work.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="bg-gray-900 dark:bg-gray-900 p-8 rounded-2xl border border-gray-800 dark:border-gray-800">
              <h3 className="text-white dark:text-white mb-6">Automated Workflows</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {useCases.map((useCase, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-red-900/30 dark:bg-red-900/30 rounded-full flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-red-500 dark:text-red-500" />
                    </div>
                    <span className="text-gray-300 dark:text-gray-300">{useCase}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-gray-900 dark:bg-gray-900 p-8 rounded-2xl border border-gray-800 dark:border-gray-800">
              <h3 className="text-white dark:text-white mb-6">Industries We Serve</h3>
              <div className="space-y-3">
                {industries.map((industry, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 dark:bg-red-600 rounded-full"></div>
                    <span className="text-gray-300 dark:text-gray-300">{industry}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 dark:text-gray-400 mt-6 pt-6 border-t border-gray-800 dark:border-gray-800">
                Any organization that relies on structured workflows and predictable decision-making 
                can benefit from our automation systems.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
