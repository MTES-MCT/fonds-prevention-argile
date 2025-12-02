import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllCommunes,
  getCommuneBySlug,
  getDepartementByCode,
  getEpciBySiren,
  getNextCommunesByPopulation,
  getTopCommunesByDepartement,
} from "@/features/seo";

import { hydrateTemplate, createCommunePlaceholders } from "../../utils";

import {
  RgaBreadcrumb,
  CommunesCards,
  CommunesTags,
  SectionDegats,
  SectionCoutInaction,
  SectionEtatAccompagne,
  CtaSmall,
  MapPlaceholder,
} from "../../components";

import templateContent from "../content/template.json";
import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";
import { RgaFooterTerritoires } from "../../components/RgaFooterTerritoires";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Génère les paramètres statiques pour toutes les pages commune
 */
export async function generateStaticParams() {
  const communes = getAllCommunes();

  return communes.map((commune) => ({
    slug: commune.slug,
  }));
}

/**
 * Génère les métadonnées SEO dynamiques
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const commune = getCommuneBySlug(slug);

  if (!commune) {
    return {
      title: "Commune non trouvée",
    };
  }

  const departement = getDepartementByCode(commune.codeDepartement);

  if (!departement) {
    return {
      title: "Commune non trouvée",
    };
  }

  const placeholders = createCommunePlaceholders(commune, departement);
  const content = hydrateTemplate(templateContent, placeholders);

  return {
    title: content.meta.title,
    description: content.meta.description,
    openGraph: {
      title: content.meta.title,
      description: content.meta.description,
      type: "website",
    },
  };
}

/**
 * Page commune RGA
 */
export default async function CommunePage({ params }: PageProps) {
  const { slug } = await params;
  const commune = getCommuneBySlug(slug);

  if (!commune) {
    notFound();
  }

  const departement = getDepartementByCode(commune.codeDepartement);

  if (!departement) {
    notFound();
  }

  // Récupérer les données associées
  const epci = commune.codeEpci ? getEpciBySiren(commune.codeEpci) : undefined;
  const communesVoisines = getNextCommunesByPopulation(commune, 8);
  const communesDepartement = getTopCommunesByDepartement(departement.code, 8);

  // Hydrater le contenu avec les placeholders
  const placeholders = createCommunePlaceholders(commune, departement);
  const content = hydrateTemplate(templateContent, placeholders);

  return (
    <main>
      {/* Hero */}
      <section className="fr-py-6w">
        <div className="fr-container">
          <RgaBreadcrumb departement={departement} commune={commune} />
          <h1>{content.hero.title}</h1>
        </div>
      </section>

      {/* Introduction */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <h2>{content.introduction.title}</h2>
          <p>{content.introduction.content}</p>
        </div>
      </section>

      {/* Carte */}
      <MapPlaceholder title={commune.nom} zoom={content.carte.zoom} />

      {/* En savoir plus - 8 communes voisines */}
      <CommunesCards communes={communesVoisines} title={content.enSavoirPlus.title} />

      {/* Dégâts visibles */}
      <SectionDegats />

      {/* CTA Small */}
      <CtaSmall />

      {/* Coût de l'inaction */}
      <SectionCoutInaction />

      {/* L'État vous accompagne */}
      <SectionEtatAccompagne conclusionLocale={content.etatAccompagne.conclusionLocale} />

      {/* CTA Full Width */}
      <SavoirSiConcerneSection />

      {/* Zone territoire - Tags des communes du département */}
      <CommunesTags
        communes={communesDepartement}
        title={content.zoneTerritoire.title}
        description={content.zoneTerritoire.description}
        currentCommuneInsee={commune.codeInsee}
      />

      {/* Lien vers l'EPCI */}
      {epci && (
        <section className="fr-py-4w">
          <div className="fr-container">
            <p>
              {commune.nom} fait partie de <a href={`/rga/epci/${epci.slug}`}>{epci.nom}</a>.
            </p>
          </div>
        </section>
      )}

      {/* Footer territoires */}
      <RgaFooterTerritoires />
    </main>
  );
}
