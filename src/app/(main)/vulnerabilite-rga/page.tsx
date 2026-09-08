import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VulnerabiliteFormulaire } from "@/features/vulnerabilite-rga";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";

// Grille de pondération non validée par un expert RGA (ADR-0030) : hors production, et
// non indexée ailleurs. Retirer le noindex (et l'entrée correspondante dans
// src/app/robots.ts) en même temps que la bascule de `isVulnerabiliteRgaActive`.
export const metadata: Metadata = {
  title: "Simulateur de vulnérabilité RGA | Fonds prévention argile",
  robots: "noindex, nofollow",
};

export default async function VulnerabiliteRgaPage() {
  if (!isVulnerabiliteRgaActive()) notFound();

  return (
    <div className="fr-container">
      {/* Breadcrumb */}
      <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
        <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-vulnerabilite-rga">
          Voir le fil d'Ariane
        </button>
        <div className="fr-collapse" id="breadcrumb-vulnerabilite-rga">
          <ol className="fr-breadcrumb__list">
            <li>
              <Link className="fr-breadcrumb__link" href="/">
                Accueil
              </Link>
            </li>
            <li>
              <span className="fr-breadcrumb__link" aria-current="page">
                Simulateur de vulnérabilité RGA
              </span>
            </li>
          </ol>
        </div>
      </nav>
      <VulnerabiliteFormulaire />
    </div>
  );
}
