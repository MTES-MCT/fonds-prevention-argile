import { Metadata } from "next";
import Link from "next/link";
import { VulnerabiliteFormulaire } from "@/features/vulnerabilite-rga";

// Grille de pondération non validée par un expert RGA (ADR-0030) : page en prod mais
// volontairement non indexée tant qu'elle n'est pas validée scientifiquement. Retirer
// ce champ (et l'entrée correspondante dans src/app/robots.ts) une fois la méthode validée.
export const metadata: Metadata = {
  title: "Simulateur de vulnérabilité RGA | Fonds prévention argile",
  robots: "noindex, nofollow",
};

export default async function VulnerabiliteRgaPage() {
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
