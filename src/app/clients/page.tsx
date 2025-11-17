import { currentUser } from "@clerk/nextjs/server";
import { SignIn, SignOutButton } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ClientsPage() {
  const user = await currentUser();

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
          {user ? (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome, {user.firstName || user.emailAddresses[0].emailAddress}
              </h1>
              <p className="text-lg text-gray-400">
                You are currently logged in.
              </p>
              <p className="text-xl font-bold mt-4">Your User ID: {user.id}</p>
              <div className="mt-8 p-6 bg-gray-900 rounded-lg text-left">
                <h2 className="text-2xl font-semibold mb-4">Your Details</h2>
                <p><span className="font-bold">User ID:</span> {user.id}</p>
                <p><span className="font-bold">Email:</span> {user.emailAddresses[0].emailAddress}</p>
              </div>
              <div className="mt-8">
                <SignOutButton>
                  <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Log Out
                  </button>
                </SignOutButton>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Please Sign In
              </h1>
              <p className="text-lg text-gray-400 mb-8">
                You need to be logged in to access the client area.
              </p>
              <SignIn
                path="/clients"
                appearance={{
                  variables: {
                    colorPrimary: "#ef4444",
                    colorBackground: "#000",
                    colorText: "#fff",
                    colorInputBackground: "#1f2937",
                    colorInputText: "#fff",
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
