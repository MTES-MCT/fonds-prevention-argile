import { SimulateurFormulaire } from "@/features/simulateur";
import { SimulateurProvider } from "@/features/simulateur/components/shared/SimulateurContext";

interface EmbedSimulateurPageProps {
  // Next 15: searchParams est une Promise dans les Server Components
  searchParams: Promise<{ partner?: string }>;
}

export default async function EmbedSimulateurPage({ searchParams }: EmbedSimulateurPageProps) {
  const { partner } = await searchParams;

  // Sans header du site dans l'iframe, l'aide reste accessible depuis l'en-tête des étapes.
  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <SimulateurProvider showHelpLink>
        <SimulateurFormulaire partner={partner ?? null} />
      </SimulateurProvider>
    </div>
  );
}
