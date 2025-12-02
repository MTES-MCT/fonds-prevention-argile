import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllEpcis,
  getEpciBySlug,
  getDepartementByCode,
  getTopCommunesByEpci,
  getTopCommunesByDepartement,
  getEpcisByDepartement,
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
  JsonLd,
  RgaMapSection,
} from "../../components";

import templateContent from "../content/template.json";
import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";
import richTextParser from "@/shared/utils/richTextParser.utils";
import { EpcisMemeDepartement } from "../../components/epci/EpcisMemeDepartement";

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
  const epcisDepartement = getEpcisByDepartement(departement.code);

  // Hydrater le contenu avec les placeholders
  const placeholders = createEpciPlaceholders(epci, departement);
  const content = hydrateTemplate(templateContent, placeholders);

  // Données JSON-LD
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Retrait-Gonflement des Argiles - ${epci.nom}`,
    description: content.meta.description,
    url: `https://fonds-prevention-argile.beta.gouv.fr/rga/epci/${epci.slug}`,
    geo: {
      "@type": "GeoShape",
      name: epci.nom,
    },
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: departement.nom,
    },
  };

  return (
    <main>
      {/* Données JSON-LD */}
      <JsonLd data={jsonLdData} />

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
      <RgaMapSection title={epci.nom} centre={epci.centre} zoomLevel="epci" />

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

      {/* Autres EPCIs du département */}
      <EpcisMemeDepartement epcis={epcisDepartement} departement={departement} currentEpciSiren={epci.codeSiren} />

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
