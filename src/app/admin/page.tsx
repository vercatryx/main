import { auth, clerkClient } from "@clerk/nextjs/server";
import { User } from "@clerk/nextjs/server";
import { createUser, updateUserRole, deleteUser } from "./actions";

// Define a type for public metadata to ensure type safety
interface UserPublicMetadata {
  role?: "superuser" | "user";
}

// Reusable button component for styling
function Button({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-500"
    >
      {children}
    </button>
  );
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

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      {/* Create User Form */}
      <div className="mb-12 bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Create New User</h2>
        <form action={createUser} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-1">Email</label>
            <input type="email" name="email" required className="w-full bg-gray-800 rounded p-2"/>
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input type="password" name="password" required className="w-full bg-gray-800 rounded p-2"/>
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <select name="role" defaultValue="user" className="w-full bg-gray-800 rounded p-2">
              <option value="user">User</option>
              <option value="superuser">Superuser</option>
            </select>
          </div>
          <Button type="submit">Create User</Button>
        </form>
      </div>

      {/* User Management List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">User Management</h2>
        <div className="bg-gray-900 rounded-lg">
          <table className="w-full text-left">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: User) => (
                <tr key={user.id} className="border-b border-gray-700 last:border-none">
                  <td className="p-4">{user.emailAddresses[0]?.emailAddress}</td>
                  <td className="p-4 capitalize">{(user.publicMetadata as UserPublicMetadata)?.role || "user"}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <form action={updateUserRole.bind(null, user.id, (user.publicMetadata as UserPublicMetadata)?.role === 'superuser' ? 'user' : 'superuser')}>
                        <Button type="submit" disabled={user.id === currentUserId}>
                          { (user.publicMetadata as UserPublicMetadata)?.role === 'superuser' ? "Make User" : "Make Superuser" }
                        </Button>
                      </form>
                      <form action={deleteUser.bind(null, user.id)}>
                        <Button type="submit" disabled={user.id === currentUserId}>Delete</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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