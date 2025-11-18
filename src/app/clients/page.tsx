import { currentUser } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";
import { getUserProjects } from "@/lib/projects";
import ClientPortal from "./page-client";

export default async function ClientsPage() {
  const user = await currentUser();
  const projects = user ? await getUserProjects(user.id) : [];

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Please Sign In
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              You need to be logged in to access the client portal.
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
      </main>
    );
  }

  const userName = user.firstName || user.emailAddresses[0].emailAddress.split('@')[0];

  return <ClientPortal projects={projects} userName={userName} />;
}
