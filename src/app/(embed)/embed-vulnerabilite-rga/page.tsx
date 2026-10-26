import { Metadata } from "next";
import { notFound } from "next/navigation";
import { VulnerabiliteFormulaire } from "@/features/vulnerabilite-rga";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { EMBED_SIMULATEUR_URL, urlRenvoiIframe } from "@/shared/domain/partners";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

interface EmbedVulnerabiliteRgaPageProps {
  searchParams: Promise<{ partner?: string }>;
}

export default async function EmbedVulnerabiliteRgaPage({ searchParams }: EmbedVulnerabiliteRgaPageProps) {
  if (!isVulnerabiliteRgaActive()) notFound();
  const { partner } = await searchParams;

  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <VulnerabiliteFormulaire urlEligibilite={urlRenvoiIframe(EMBED_SIMULATEUR_URL, partner)} />
    </div>
  );
}
