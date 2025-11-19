import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-100">Welcome Back</h1>
          <p className="text-gray-400">Sign in to access your account</p>
        </div>

        <SignIn
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
          redirectUrl="/clients"
          signUpUrl="/sign-up"
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Need an invitation?{" "}
            <span className="text-gray-500">Contact your administrator</span>
          </p>
        </div>
      </div>
    </main>
  );
}
