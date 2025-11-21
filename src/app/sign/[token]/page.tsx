import SignPageClient from "./page-client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SignPage({ params }: PageProps) {
  const { token } = await params;
  return <SignPageClient token={token} />;
}


