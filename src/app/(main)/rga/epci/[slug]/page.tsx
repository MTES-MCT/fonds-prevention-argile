import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllEpcis,
  getEpciBySlug,
  getDepartementByCode,
  getTopCommunesByEpci,
  getTopCommunesByDepartement,
} from "@/features/seo";

import { hydrateTemplate, createEpciPlaceholders } from "../../utils";

import {
  RgaBreadcrumb,
  CommunesCards,
  CommunesTags,
  SectionDegats,
  SectionCoutInaction,
  SectionEtatAccompagne,
  CtaSmall,
  CtaFullWidth,
  MapPlaceholder,
} from "../../components";

import templateContent from "../content/template.json";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Génère les paramètres statiques pour toutes les pages EPCI
 */
export async function generateStaticParams() {
  const epcis = getAllEpcis();

  return epcis.map((epci) => ({
    slug: epci.slug,
  }));
}

/**
 * Génère les métadonnées SEO dynamiques
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const epci = getEpciBySlug(slug);

  if (!epci) {
    return {
      title: "EPCI non trouvé",
    };
  }

  const departement = getDepartementByCode(epci.codesDepartements[0]);

  if (!departement) {
    return {
      title: "EPCI non trouvé",
    };
  }

  const placeholders = createEpciPlaceholders(epci, departement);
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
 * Page EPCI RGA
 */
export default async function EpciPage({ params }: PageProps) {
  const { slug } = await params;
  const epci = getEpciBySlug(slug);

  if (!epci) {
    notFound();
  }

  const departement = getDepartementByCode(epci.codesDepartements[0]);

  if (!departement) {
    notFound();
  }

  // Récupérer les données associées
  const communesEpci = getTopCommunesByEpci(epci.codeSiren, 8);
  const communesDepartement = getTopCommunesByDepartement(departement.code, 8);

  // Hydrater le contenu avec les placeholders
  const placeholders = createEpciPlaceholders(epci, departement);
  const content = hydrateTemplate(templateContent, placeholders);

  return (
    <main>
      {/* Hero */}
      <section className="fr-py-6w">
        <div className="fr-container">
          <RgaBreadcrumb departement={departement} epci={epci} />
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
      <MapPlaceholder title={epci.nom} zoom={content.carte.zoom} />

      {/* En savoir plus - Communes de l'EPCI */}
      <CommunesCards
        communes={communesEpci}
        title={content.enSavoirPlus.title}
        description={content.enSavoirPlus.description}
      />

      {/* Dégâts visibles */}
      <SectionDegats />

      {/* CTA Small */}
      <CtaSmall />

      {/* Coût de l'inaction */}
      <SectionCoutInaction />

      {/* L'État vous accompagne */}
      <SectionEtatAccompagne conclusionLocale={content.etatAccompagne.conclusionLocale} />

      {/* CTA Full Width */}
      <CtaFullWidth />

      {/* Zone territoire - Tags des communes du département */}
      <CommunesTags
        communes={communesDepartement}
        title={content.zoneTerritoire.title}
        description={content.zoneTerritoire.description}
      />

      {/* Lien vers le département */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <p>
            {epci.nom} fait partie du département <a href={`/rga/departement/${departement.slug}`}>{departement.nom}</a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
