import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";
import { getUserProjects, getAllUserProjects } from "@/lib/projects";
import ClientPortal from "./page-client";

interface UserPublicMetadata {
  role?: "superuser" | "user";
}

export default async function ClientsPage() {
  const user = await currentUser();

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

  const publicMetadata = user.publicMetadata as UserPublicMetadata;
  const isAdmin = publicMetadata?.role === "superuser";

  const userName = user.firstName || user.emailAddresses[0].emailAddress.split('@')[0];

  // If admin, get all projects and all users
  if (isAdmin) {
    const client = await clerkClient();
    const { data: allUsers } = await client.users.getUserList();
    const allProjects = await getAllUserProjects();

    // Create a map of users with their projects
    const usersWithProjects = allUsers
      .filter(u => allProjects[u.id] && allProjects[u.id].length > 0) // Only users with projects
      .map(u => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.emailAddresses[0]?.emailAddress || 'Unknown',
        email: u.emailAddresses[0]?.emailAddress || '',
        projects: allProjects[u.id] || []
      }));

    return (
      <ClientPortal
        userName={userName}
        isAdmin={true}
        usersWithProjects={usersWithProjects}
      />
    );
  }

  // Regular user - just get their projects
  const projects = await getUserProjects(user.id);

  return (
    <ClientPortal
      projects={projects}
      userName={userName}
      isAdmin={false}
    />
  );
}
