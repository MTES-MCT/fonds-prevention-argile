import { Metadata } from "next";
import { notFound } from "next/navigation";
import { VulnerabiliteFormulaire } from "@/features/vulnerabilite-rga";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { urlSimulateurEmbarque } from "@/features/simulateur/domain/value-objects/simulateur-routes";
import { normalizePartnerSlug } from "@/shared/domain/partners";

// Cf. src/app/(main)/vulnerabilite-rga/page.tsx : grille non validée (ADR-0030), hors
// production et non indexée ailleurs.
export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

interface EmbedVulnerabiliteRgaPageProps {
  searchParams: Promise<{ partner?: string | string[] }>;
}

export default async function EmbedVulnerabiliteRgaPage({ searchParams }: EmbedVulnerabiliteRgaPageProps) {
  if (!isVulnerabiliteRgaActive()) notFound();

  const { partner } = await searchParams;
  const partenaire = normalizePartnerSlug(typeof partner === "string" ? partner : null);

  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <VulnerabiliteFormulaire urlSimulateurEligibilite={urlSimulateurEmbarque(partenaire)} />
    </div>
  );
}
