import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function GetStarted() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black dark:bg-black">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-white mb-8 text-3xl md:text-5xl">
          Ready to Get Your Time Back?
        </h2>
        
        <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
          Let's talk about what you're spending too much time on. 
          We'll show you how we can help.
        </p>
        
        <div className="bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-800">
          <h3 className="text-white text-2xl mb-6">Here's What Happens Next:</h3>
          
          <div className="space-y-6 text-left max-w-2xl mx-auto mb-10">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white">
                1
              </div>
              <div>
                <p className="text-gray-300 text-lg">
                  <span className="text-white">We listen.</span> Tell us what tasks are eating up your time.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white">
                2
              </div>
              <div>
                <p className="text-gray-300 text-lg">
                  <span className="text-white">We explain.</span> We'll show you exactly how we can help.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white">
                3
              </div>
              <div>
                <p className="text-gray-300 text-lg">
                  <span className="text-white">We build it.</span> Our team creates a custom solution for your specific needs.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white">
                4
              </div>
              <div>
                <p className="text-gray-300 text-lg">
                  <span className="text-white">You relax.</span> Watch those repetitive tasks handle themselves.
                </p>
              </div>
            </div>
          </div>
          
          <Link href="/contact" className="px-10 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xl flex items-center justify-center gap-3 mx-auto">
            Schedule a Free Consultation
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </section>
  );
}
