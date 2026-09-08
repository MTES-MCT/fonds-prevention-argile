import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicStatsCardsCached,
  getPublicStatsEvolutionCached,
} from "@/features/public-stats/services/public-stats.service";
import { StatCard } from "./components/StatCard";
import { StatsEvolutionCharts } from "./components/StatsEvolutionCharts";

// Pas d'ISR : sans segment dynamique, Next prérendrait la page au build, où ni la BDD ni Matomo
// ne répondent. Le cache horaire est porté par `unstable_cache` côté service.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistiques | Fonds Prévention Argile",
  description: "Chiffres clés du fonds de prévention argile depuis son lancement.",
};

export default async function StatsPage() {
  const [cards, evolution] = await Promise.all([getPublicStatsCardsCached(), getPublicStatsEvolutionCached()]);

  return (
    <section className="fr-container-fluid fr-py-2v">
      <div className="fr-container fr-py-4w">
        <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
          <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-stats">
            Voir le fil d'Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb-stats">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href="/">
                  Accueil
                </Link>
              </li>
              <li>
                <span className="fr-breadcrumb__link" aria-current="page">
                  Statistiques
                </span>
              </li>
            </ol>
          </div>
        </nav>

        <h1>Statistiques</h1>
        <p className="fr-text--lg fr-mb-4w" style={{ color: "var(--text-mention-grey)" }}>
          Chiffres clés du fonds de prévention argile depuis son lancement.
        </p>

        <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
          <StatCard value={cards.visiteurs} label="Visiteurs uniques" />
          <StatCard value={cards.simulationsTerminees} label="Simulations terminées" />
          <StatCard value={cards.simulationsEligibles} label="Simulations éligibles" />
          <StatCard value={cards.comptesCrees} label="Comptes créés" />
          <StatCard value={cards.dossiersEligibiliteDeposes} label="Dossiers d'éligibilité déposés" />
          <StatCard value={cards.diagnostics} label="Diagnostics réalisés ou en cours" />
        </div>

        <h2 className="fr-h4 fr-mb-3w">Évolution mensuelle</h2>
        <StatsEvolutionCharts evolution={evolution} />
      </div>
    </section>
  );
}
