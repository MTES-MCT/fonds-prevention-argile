import Link from "next/link";

import { getAllDepartements } from "@/features/seo";
import type { DepartementSEO } from "@/features/seo";

const DEPARTEMENTS_PAR_REGION: Record<string, string[]> = {
  "Auvergne-Rhône-Alpes": ["03", "63"],
  "Centre-Val de Loire": ["36"],
  "Grand Est": ["54"],
  "Hauts-de-France": ["59"],
  "Nouvelle-Aquitaine": ["24", "47"],
  Occitanie: ["32", "81", "82"],
  "Provence-Alpes-Côte d'Azur": ["04"],
};

const REGIONS_ORDONNEES = [
  "Auvergne-Rhône-Alpes",
  "Centre-Val de Loire",
  "Grand Est",
  "Hauts-de-France",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Provence-Alpes-Côte d'Azur",
];

interface RegionData {
  nom: string;
  departements: DepartementSEO[];
}

function getDepartementsParRegion(): RegionData[] {
  const allDepartements = getAllDepartements();

  return REGIONS_ORDONNEES.map((regionNom) => {
    const codesDepartements = DEPARTEMENTS_PAR_REGION[regionNom] ?? [];
    const departements = codesDepartements
      .map((code) => allDepartements.find((d) => d.code === code))
      .filter((d): d is DepartementSEO => d !== undefined);

    return {
      nom: regionNom,
      departements,
    };
  }).filter((region) => region.departements.length > 0);
}

export function RgaFooter() {
  const regions = getDepartementsParRegion();

  return (
    <div className="fr-grid-row fr-grid-row--start fr-grid-row--gutters">
      {regions.map((region) => (
        <div key={region.nom} className="fr-col-12 fr-col-sm-6 fr-col-md-4 fr-col-lg-2">
          <h3 className="fr-footer__top-cat">RGA en {region.nom}</h3>
          <ul className="fr-footer__top-list">
            {region.departements.map((departement) => (
              <li key={departement.code}>
                <Link href={`/rga/departement/${departement.slug}`} className="fr-footer__top-link">
                  {departement.nom}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
