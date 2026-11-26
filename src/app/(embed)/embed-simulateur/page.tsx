import { SimulateurFormulaire } from "@/features/simulateur";
import { SimulateurProvider } from "@/features/simulateur/components/shared/SimulateurContext";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { urlVulnerabiliteEmbarquee } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-routes";
import { normalizePartnerSlug } from "@/shared/domain/partners";

interface EmbedSimulateurPageProps {
  // Next 15: searchParams est une Promise dans les Server Components
  searchParams: Promise<{ partner?: string | string[]; vulnerabilite?: string | string[] }>;
}

export default async function EmbedSimulateurPage({ searchParams }: EmbedSimulateurPageProps) {
  const { partner, vulnerabilite } = await searchParams;
  // Un paramètre répété arrive en tableau : on l'ignore plutôt que de le passer à du code qui attend un texte.
  const partenaire = typeof partner === "string" ? partner : null;

  // `?vulnerabilite=0` : l'intégrateur ne veut pas du renvoi vers le simulateur de vulnérabilité.
  const urlVulnerabilite =
    isVulnerabiliteRgaActive() && vulnerabilite !== "0"
      ? urlVulnerabiliteEmbarquee(normalizePartnerSlug(partenaire))
      : null;

  // Sans header du site dans l'iframe, l'aide reste accessible depuis l'en-tête des étapes.
  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <SimulateurProvider showHelpLink urlVulnerabilite={urlVulnerabilite}>
        <SimulateurFormulaire partner={partenaire} />
      </SimulateurProvider>
    </div>
  );
}
