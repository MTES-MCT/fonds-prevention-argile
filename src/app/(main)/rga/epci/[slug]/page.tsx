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
  MapPlaceholder,
} from "../../components";

import templateContent from "../content/template.json";
import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";
import { RgaFooterTerritoires } from "../../components/RgaFooterTerritoires";
import richTextParser from "@/shared/utils/richTextParser.utils";

// Nombre de communes à afficher
const NB_COMMUNES_A_AFFICHER = 8;

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
  const communesEpci = getTopCommunesByEpci(epci.codeSiren, NB_COMMUNES_A_AFFICHER);
  const communesDepartement = getTopCommunesByDepartement(departement.code, NB_COMMUNES_A_AFFICHER);

  // Hydrater le contenu avec les placeholders
  const placeholders = createEpciPlaceholders(epci, departement);
  const content = hydrateTemplate(templateContent, placeholders);

  return (
    <main>
      {/* Hero */}
      <div className="fr-container">
        <RgaBreadcrumb departement={departement} epci={epci} />
      </div>

      {/* Introduction */}
      <div className="fr-container">
        <h2>{content.introduction.title}</h2>
        <p>{richTextParser(content.introduction.content)}</p>
      </div>

      {/* Carte */}
      <MapPlaceholder title={epci.nom} zoom={content.carte.zoom} />

      {/* En savoir plus - Communes de l'EPCI */}
      <CommunesCards communes={communesEpci} title={content.enSavoirPlus.title} />

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

      {/* Footer territoires */}
      <RgaFooterTerritoires />
    </main>
  );
}
