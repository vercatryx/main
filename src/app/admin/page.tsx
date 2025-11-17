import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAllUserProjects } from "@/lib/projects";
import AdminClient from "./page-client";

// Define a type for public metadata to ensure type safety
interface UserPublicMetadata {
  role?: "superuser" | "user";
}

// Serializable user type for client component
export interface SerializableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  publicMetadata: UserPublicMetadata;
}

async function AdminDashboard() {
  const { userId: currentUserId } = await auth();

  // Middleware ensures user is logged in, but we check for userId just in case.
  if (!currentUserId) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold">Access Denied</h1>
        <p className="mt-4">You must be logged in to view this page.</p>
      </div>
    );
  }

  const client = await clerkClient();

  // Fetch the user directly from Clerk to get the most up-to-date metadata
  const user = await client.users.getUser(currentUserId);
  const publicMetadata = user.publicMetadata as UserPublicMetadata;

  // Check the role from the directly fetched user object
  if (publicMetadata?.role !== "superuser") {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold">Access Denied</h1>
        <p className="mt-4">You do not have permission to view this page.</p>
      </div>
    );
  }

  const { data: users } = await client.users.getUserList();
  const projects = await getAllUserProjects();

  // Serialize users for client component
  const serializedUsers: SerializableUser[] = users.map(user => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddresses: user.emailAddresses.map(email => ({
      emailAddress: email.emailAddress
    })),
    publicMetadata: user.publicMetadata as UserPublicMetadata
  }));

  return <AdminClient users={serializedUsers} currentUserId={currentUserId} initialProjects={projects} />;
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <AdminDashboard />
      </div>
    </main>
  );
}