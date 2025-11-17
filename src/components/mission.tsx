import { Target, ArrowRight } from "lucide-react";
import Link from "next/link";

export function Mission() {
  return (
    <section id="mission" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-blue-950 to-blue-900 dark:from-blue-950 dark:to-blue-900 rounded-3xl p-12 md:p-16 text-white border border-blue-800">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-white">Our Mission</h2>
            </div>
            
            <p className="text-xl leading-relaxed mb-8 text-blue-100">
              To transform complex, manual workflows into unified, intelligent systems. 
              We help organizations operate more efficiently by combining automation, 
              clean data structures, and modern communication tools into a single cohesive solution.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div>
                <div className="text-3xl mb-2">Reduce</div>
                <div className="text-blue-200">Workload & Errors</div>
              </div>
              <div>
                <div className="text-3xl mb-2">Streamline</div>
                <div className="text-blue-200">Operations</div>
              </div>
              <div>
                <div className="text-3xl mb-2">Integrate</div>
                <div className="text-blue-200">Systems & Data</div>
              </div>
            </div>
            
            <Link href="/contact" className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
              Start Your Automation Journey
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-black dark:bg-black rounded-2xl border border-gray-800 dark:border-gray-800">
            <h3 className="text-white dark:text-white mb-4">Built for Your Workflow</h3>
            <p className="text-gray-300 dark:text-gray-300 leading-relaxed">
              Every organization has unique processes. Our solutions are tailored to fit your 
              specific needs, whether you're working with existing systems or building from scratch. 
              We integrate seamlessly with legacy tools and modern platforms alike.
            </p>
          </div>
          
          <div className="p-8 bg-black dark:bg-black rounded-2xl border border-gray-800 dark:border-gray-800">
            <h3 className="text-white dark:text-white mb-4">Seamless Integration</h3>
            <p className="text-gray-300 dark:text-gray-300 leading-relaxed">
              Our platform connects every component—AI agents, CRMs, communication systems, 
              and third-party software—into one unified system. No disruption to daily operations, 
              just enhanced efficiency and automation from day one.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
