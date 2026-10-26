import { SimulateurFormulaire } from "@/features/simulateur";
import { SimulateurProvider } from "@/features/simulateur/components/shared/SimulateurContext";
import {
  EMBED_VULNERABILITE_RGA_URL,
  urlRenvoiIframe,
  vulnerabiliteRefuseeParIntegrateur,
} from "@/shared/domain/partners";

interface EmbedSimulateurPageProps {
  // Next 15: searchParams est une Promise dans les Server Components
  searchParams: Promise<{ partner?: string; vulnerabilite?: string }>;
}

export default async function EmbedSimulateurPage({ searchParams }: EmbedSimulateurPageProps) {
  const { partner, vulnerabilite } = await searchParams;
  const urlVulnerabilite = vulnerabiliteRefuseeParIntegrateur(vulnerabilite)
    ? null
    : urlRenvoiIframe(EMBED_VULNERABILITE_RGA_URL, partner);

  // Sans header du site dans l'iframe, l'aide reste accessible depuis l'en-tête des étapes.
  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <SimulateurProvider showHelpLink urlVulnerabilite={urlVulnerabilite}>
        <SimulateurFormulaire partner={partner ?? null} />
      </SimulateurProvider>
    </div>
  );
}
