import { SimulateurFormulaire } from "@/features/simulateur";

interface EmbedSimulateurPageProps {
  // Next 15: searchParams est une Promise dans les Server Components
  searchParams: Promise<{ partner?: string }>;
}

export default async function EmbedSimulateurPage({ searchParams }: EmbedSimulateurPageProps) {
  const { partner } = await searchParams;

  // Afficher le simulateur en mode embed
  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <SimulateurFormulaire partner={partner ?? null} />
    </div>
  );
}
