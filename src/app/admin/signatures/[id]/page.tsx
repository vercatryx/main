import SignaturePlacementPage from "./page-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSignaturePlacementPage({ params }: PageProps) {
  const { id } = await params;
  return <SignaturePlacementPage id={id} />;
}


