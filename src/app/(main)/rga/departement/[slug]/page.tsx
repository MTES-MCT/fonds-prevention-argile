import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDepartementBySlug, getTopCommunesByDepartement, getEpcisByDepartement } from "@/features/seo";

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
  JsonLd,
  RgaMapSection,
  DisplayAllersVers,
} from "../../components";

import templateContent from "../content/template.json";
import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";
import richTextParser from "@/shared/utils/richTextParser.utils";
import { formatDepartementAvecArticle } from "@/shared/utils";
import { getTotalCatnatForDepartementAction } from "@/features/seo/catnat/actions";
import { CatnatSummary } from "../../components/catnat";

// Nombre de communes à afficher dans la section "En savoir plus"
const NB_COMMUNES_A_AFFICHER = 8;

// ISR : cache 24h, généré à la demande sans prérendu au build, pour absorber les pics de crawl (OOM 21/06/2026).
export const revalidate = 86400;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Liste vide = pas de prérendu au build, mais route en ISR : chaque slug généré au 1er hit puis caché (requis pour activer le cache).
export function generateStaticParams(): { slug: string }[] {
  return [];
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
  const communes = getTopCommunesByDepartement(departement.code, NB_COMMUNES_A_AFFICHER);
  const epcis = getEpcisByDepartement(departement.code);

  // Récupérer le total de catastrophes naturelles
  const totalCatnat = await getTotalCatnatForDepartementAction(departement.code);

  // Hydrater le contenu avec les placeholders
  const placeholders = createDepartementPlaceholders(departement);
  const content = hydrateTemplate(templateContent, placeholders);

  // Données JSON-LD
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Retrait-Gonflement des Argiles en ${departement.nom}`,
    description: content.meta.description,
    url: `https://fonds-prevention-argile.beta.gouv.fr/rga/departement/${departement.slug}`,
    geo: {
      "@type": "GeoShape",
      name: departement.nom,
    },
    isPartOf: {
      "@type": "Country",
      name: "France",
    },
  };

  return (
    <main>
      {/* Données JSON-LD */}
      <JsonLd data={jsonLdData} />

      {/* Fil d'Ariane */}
      <div className="fr-container">
        <RgaBreadcrumb departement={departement} />
      </div>

      {/* Introduction */}
      <div className="fr-container">
        <h1>{content.introduction.title}</h1>
        <p>{richTextParser(content.introduction.content)}</p>
      </div>

      {/* Carte */}
      <RgaMapSection title={departement.nom} centre={departement.centre} zoomLevel="departement" />

      {/* Résumé catastrophes naturelles */}
      <CatnatSummary
        totalCatnat={totalCatnat}
        nomTerritoire={departement.nom}
        typeTerritoire="département"
        codeTerritoire={departement.code}
      />

      {/* En savoir plus - communes */}
      <CommunesCards communes={communes} title={content.enSavoirPlus.title} />

      {/* Dégâts visibles */}
      <SectionDegats />

      {/* CTA Small */}
      <CtaSmall />

      {/* Coût de l'inaction */}
      <SectionCoutInaction />

      {/* L'État vous accompagne */}
      <SectionEtatAccompagne conclusionLocale={content.etatAccompagne.conclusionLocale} />

      {/* Allers Vers - Conseillers locaux */}
      <DisplayAllersVers codeDepartement={departement.code} nomDepartement={departement.nom} />

      {/* CTA Full Width */}
      <SavoirSiConcerneSection />

      {/* Zone territoire - Tags des communes */}
      <CommunesTags communes={communes} title={content.zoneTerritoire.title} />

      {/* Liste des EPCI */}
      <EpciTags
        epcis={epcis}
        title={`Risques Retrait-Gonflement dans les intercommunalités ${formatDepartementAvecArticle(departement.code, departement.nom)} (${departement.code})`}
      />
    </main>
  );
}
