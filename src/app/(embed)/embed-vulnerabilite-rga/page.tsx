import { Metadata } from "next";
import { VulnerabiliteFormulaire } from "@/features/vulnerabilite-rga";

// Cf. src/app/(main)/vulnerabilite-rga/page.tsx : grille non validée (ADR-0030), non indexée.
export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function EmbedVulnerabiliteRgaPage() {
  return (
    <div className="w-full" style={{ minHeight: "650px" }}>
      <VulnerabiliteFormulaire />
    </div>
  );
}
