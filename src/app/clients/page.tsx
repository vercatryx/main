import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ClientsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Coming Soon</h1>
            <p className="text-xl text-gray-400">
              We're working on something special. Check back soon!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
