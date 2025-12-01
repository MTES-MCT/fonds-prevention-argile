import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllDepartements,
  getDepartementBySlug,
  getTopCommunesByDepartement,
  getEpcisByDepartement,
} from "@/features/seo";

import { hydrateTemplate, createDepartementPlaceholders } from "../../utils";

import {
  RgaBreadcrumb,
  CommunesCards,
  CommunesTags,
  EpciTags,
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
 * Génère les paramètres statiques pour toutes les pages département
 */
export async function generateStaticParams() {
  const departements = getAllDepartements();

  return departements.map((departement) => ({
    slug: departement.slug,
  }));
}

/**
 * Génère les métadonnées SEO dynamiques
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const departement = getDepartementBySlug(slug);

  if (!departement) {
    return {
      title: "Département non trouvé",
    };
  }

  const placeholders = createDepartementPlaceholders(departement);
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
 * Page département RGA
 */
export default async function DepartementPage({ params }: PageProps) {
  const { slug } = await params;
  const departement = getDepartementBySlug(slug);

  if (!departement) {
    notFound();
  }

  // Récupérer les données associées
  const communes = getTopCommunesByDepartement(departement.code, 8);
  const epcis = getEpcisByDepartement(departement.code);

  // Hydrater le contenu avec les placeholders
  const placeholders = createDepartementPlaceholders(departement);
  const content = hydrateTemplate(templateContent, placeholders);

  return (
    <main>
      {/* Hero */}
      <section className="fr-py-6w">
        <div className="fr-container">
          <RgaBreadcrumb departement={departement} />
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
      <MapPlaceholder title={departement.nom} zoom={content.carte.zoom} />

      {/* En savoir plus - 8 communes */}
      <CommunesCards
        communes={communes}
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

      {/* Zone territoire - Tags des communes */}
      <CommunesTags
        communes={communes}
        title={content.zoneTerritoire.title}
        description={content.zoneTerritoire.description}
      />

      {/* Liste des EPCI */}
      <EpciTags epcis={epcis} title={`Intercommunalités du ${departement.nom}`} />
    </main>
  );
}
