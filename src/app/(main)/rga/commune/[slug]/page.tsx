import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllCommunes,
  getCommuneBySlug,
  getDepartementByCode,
  getEpciBySiren,
  getTopCommunesByDepartement,
} from "@/features/seo";

import { hydrateTemplate, createCommunePlaceholders } from "../../utils";

import {
  RgaBreadcrumb,
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
import { richTextParser } from "@/shared/utils";

// Nombre de communes à afficher
const NB_COMMUNES_A_AFFICHER = 8;

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
  const communesDepartement = getTopCommunesByDepartement(departement.code, NB_COMMUNES_A_AFFICHER);

  // Hydrater le contenu avec les placeholders
  const placeholders = createCommunePlaceholders(commune, departement);
  const content = hydrateTemplate(templateContent, placeholders);

  return (
    <main>
      {/* Fil d'Ariane */}
      <div className="fr-container">
        <RgaBreadcrumb departement={departement} commune={commune} />
      </div>

      {/* Introduction */}
      <div className="fr-container">
        <h2>{content.introduction.title}</h2>
        <p>{richTextParser(content.introduction.content)}</p>
      </div>

      {/* Carte */}
      <MapPlaceholder title={commune.nom} zoom={content.carte.zoom} />

      {/* Dégâts visibles */}
      <SectionDegats />

      {/* CTA Small */}
      <CtaSmall />

      {/* Coût de l'inaction */}
      <SectionCoutInaction />

      {/* L'État vous accompagne */}
      <SectionEtatAccompagne />

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
