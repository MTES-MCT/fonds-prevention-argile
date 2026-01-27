import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllCommunes,
  getCommuneBySlug,
  getCommunesByEpci,
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
  CommunesMemeEpci,
  JsonLd,
  RgaMapSection,
  DisplayAllersVers,
} from "../../components";

import templateContent from "../content/template.json";
import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";
import { richTextParser } from "@/shared/utils";
import { CatnatTableCommune } from "../../components/catnat";
import { getCatnatForCommuneAction } from "@/features/seo/catnat/actions/catnat.actions";

// Nombre de communes à afficher
const NB_COMMUNES_A_AFFICHER = 8;

export const dynamic = "force-dynamic";

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

  // Récupérer les catastrophes naturelles
  const catnats = await getCatnatForCommuneAction(commune.codeInsee);

  if (!departement) {
    notFound();
  }

  // Récupérer les données associées
  const epci = commune.codeEpci ? getEpciBySiren(commune.codeEpci) : undefined;
  const communesDepartement = getTopCommunesByDepartement(departement.code, NB_COMMUNES_A_AFFICHER);
  const communesEpci = epci ? getCommunesByEpci(epci.codeSiren) : [];

  // Hydrater le contenu avec les placeholders
  const placeholders = createCommunePlaceholders(commune, departement);
  const content = hydrateTemplate(templateContent, placeholders);

  // Données JSON-LD
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Retrait-Gonflement des Argiles à ${commune.nom}`,
    description: content.meta.description,
    url: `https://fonds-prevention-argile.beta.gouv.fr/rga/commune/${commune.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: commune.nom,
      postalCode: commune.codesPostaux[0] ?? "",
      addressRegion: departement.nom,
      addressCountry: "FR",
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

      {/* Fil d'Ariane */}
      <div className="fr-container">
        <RgaBreadcrumb departement={departement} commune={commune} />
      </div>

      {/* Introduction */}
      <div className="fr-container">
        <h1>{content.introduction.title}</h1>
        <p>{richTextParser(content.introduction.content)}</p>
      </div>

      {/* Carte */}
      <RgaMapSection title={commune.nom} centre={commune.centre} zoomLevel="commune" />

      {/* Historique des catastrophes naturelles */}
      <CatnatTableCommune catnats={catnats} nomCommune={commune.nom} codeDepartement={departement.code} />

      {/* Dégâts visibles */}
      <SectionDegats />

      {/* CTA Small */}
      <CtaSmall />

      {/* Coût de l'inaction */}
      <SectionCoutInaction />

      {/* L'État vous accompagne */}
      <SectionEtatAccompagne conclusionLocale={content.etatAccompagne.conclusionLocale} />

      {/* Allers Vers - Conseillers locaux (priorité EPCI, fallback département) */}
      <DisplayAllersVers
        codeDepartement={departement.code}
        nomDepartement={departement.nom}
        codeEpci={commune.codeEpci}
      />

      {/* CTA Full Width */}
      <SavoirSiConcerneSection />

      {/* Communes du même EPCI */}
      {epci && <CommunesMemeEpci communes={communesEpci} epci={epci} currentCommuneInsee={commune.codeInsee} />}

      {/* Zone territoire - Tags des communes du département */}
      <CommunesTags
        communes={communesDepartement}
        title={content.zoneTerritoire.title}
        currentCommuneInsee={commune.codeInsee}
      />

      {/* Liens vers le département et l'EPCI */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <p>
            {commune.nom} est une commune du département{" "}
            <a href={`/rga/departement/${departement.slug}`}>
              {departement.nom} ({departement.code})
            </a>
            {epci && (
              <>
                {" "}
                et fait partie de l'intercommunalité <a href={`/rga/epci/${epci.slug}`}>{epci.nom}</a>
              </>
            )}
            .
          </p>
        </div>
      </section>
    </main>
  );
}
