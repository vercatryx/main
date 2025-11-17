import { currentUser } from "@clerk/nextjs/server";
import { SignIn, SignOutButton } from "@clerk/nextjs";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getUserProjects } from "@/lib/projects";

export default async function ClientsPage() {
  const user = await currentUser();
  const projects = user ? await getUserProjects(user.id) : [];

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

        {user ? (
          <div>
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome, {user.firstName || user.emailAddresses[0].emailAddress}!
              </h1>
              <p className="text-lg text-gray-400">
                Here are your projects and resources
              </p>
            </div>

            {/* Projects Section */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Your Projects</h2>
              {projects.length === 0 ? (
                <div className="bg-gray-900 rounded-lg p-8 text-center">
                  <p className="text-gray-400">
                    No projects assigned yet. Your admin will add them soon!
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors"
                    >
                      <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                      {project.description && (
                        <p className="text-gray-400 mb-4">{project.description}</p>
                      )}
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <span>View Project</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Account Details</h2>
              <div className="space-y-2 text-gray-300">
                <p>
                  <span className="font-bold text-white">Name:</span>{" "}
                  {user.firstName} {user.lastName}
                </p>
                <p>
                  <span className="font-bold text-white">Email:</span>{" "}
                  {user.emailAddresses[0].emailAddress}
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <SignOutButton>
                <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Log Out
                </button>
              </SignOutButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
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
          </div>
        )}
      </div>
    </main>
  );
}
