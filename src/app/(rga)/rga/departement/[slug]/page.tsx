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
  MapPlaceholder,
  JsonLd,
} from "../../components";

import templateContent from "../content/template.json";
import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";
import richTextParser from "@/shared/utils/richTextParser.utils";
import { formatDepartementAvecArticle } from "@/features/seo/domain/config/departements-label.config";

// Nombre de communes à afficher dans la section "En savoir plus"
const NB_COMMUNES_A_AFFICHER = 8;

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
  const communes = getTopCommunesByDepartement(departement.code, NB_COMMUNES_A_AFFICHER);
  const epcis = getEpcisByDepartement(departement.code);

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
        <h2>{content.introduction.title}</h2>
        <p>{richTextParser(content.introduction.content)}</p>
      </div>

      {/* Carte */}
      <MapPlaceholder title={departement.nom} zoom={content.carte.zoom} />

      {/* En savoir plus - communes */}
      <CommunesCards communes={communes} title={content.enSavoirPlus.title} />

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

      {/* Zone territoire - Tags des communes */}
      <CommunesTags
        communes={communes}
        title={content.zoneTerritoire.title}
        description={content.zoneTerritoire.description}
      />

      {/* Liste des EPCI */}
      <EpciTags
        epcis={epcis}
        title={`Risques Retrait-Gonflement dans les intercommunalités ${formatDepartementAvecArticle(departement.code, departement.nom)} (${departement.code})`}
      />
    </main>
  );
}
