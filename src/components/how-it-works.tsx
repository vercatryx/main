export function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black dark:bg-black">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-white text-center mb-6 text-3xl md:text-5xl">
          What Can We Automate?
        </h2>
        <p className="text-xl md:text-2xl text-gray-300 text-center mb-16">
          If you do it more than once a week, we can probably automate it.
        </p>
        
        <div className="bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-white text-xl mb-6">Common Tasks We Handle:</h3>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Billing, insurance claims, and prior authorizations</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Checking insurance eligibility and benefits</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Data entry, document scanning, and pulling information from files</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Payment posting, reconciliation, and following up on aging accounts</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Appointment scheduling, reminders, and rescheduling</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-white text-xl mb-6">&nbsp;</h3>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Intake forms, onboarding, and collecting documents</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Compliance reports and audit preparation</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Inventory tracking and restock notifications</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Calling, texting, and emailing customers or patients</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-lg">Quality checks, error detection, and reviewing processes</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-300 text-lg text-center leading-relaxed">
              Think of it like hiring an assistant who never gets tired, never makes mistakes, 
              and can work on thousands of tasks at the same time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}