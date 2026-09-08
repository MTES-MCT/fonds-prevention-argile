import { Metadata } from "next";
import { notFound } from "next/navigation";
import { VulnerabiliteFormulaire } from "@/features/vulnerabilite-rga";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";

// Cf. src/app/(main)/vulnerabilite-rga/page.tsx : grille non validée (ADR-0030), hors
// production et non indexée ailleurs.
export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function EmbedVulnerabiliteRgaPage() {
  if (!isVulnerabiliteRgaActive()) notFound();

  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <VulnerabiliteFormulaire />
    </div>
  );
}
