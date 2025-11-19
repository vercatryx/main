import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { verifyInvitationToken } from "@/lib/invitations";

interface SignUpPageProps {
  searchParams: Promise<{ invitation?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const invitationToken = params.invitation;

  // Verify invitation token
  if (!invitationToken) {
    // No invitation - redirect to home or show error
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-100">Invitation Required</h1>
          <p className="text-lg text-gray-400 mb-8">
            You need an invitation to create an account. Please contact your administrator.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-700/80 hover:bg-blue-600 rounded-lg transition-colors text-white font-medium inline-block"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  // Verify the token is valid
  const tokenData = verifyInvitationToken(invitationToken);

  if (!tokenData) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-100">Invalid or Expired Invitation</h1>
          <p className="text-lg text-gray-400 mb-8">
            This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-700/80 hover:bg-blue-600 rounded-lg transition-colors text-white font-medium inline-block"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-100">Create Your Account</h1>
          <p className="text-gray-400">
            Please sign up with the email: <strong>{tokenData.email}</strong>
          </p>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "#0c0a09",
              colorText: "#f5f5f5",
              colorInputBackground: "#1c1917",
              colorInputText: "#e5e5e5",
            },
            elements: {
              card: "bg-gray-900/80 border border-gray-800/50",
              headerTitle: "text-gray-100",
              headerSubtitle: "text-gray-400",
              formButtonPrimary: "bg-blue-700/80 hover:bg-blue-600",
              footerActionLink: "text-blue-400 hover:text-blue-300",
            },
          }}
          forceRedirectUrl="/clients"
          fallbackRedirectUrl="/clients"
          signInUrl="/sign-in"
          routing="path"
          path="/sign-up"
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <a href="/sign-in" className="text-blue-400 hover:text-blue-300">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
