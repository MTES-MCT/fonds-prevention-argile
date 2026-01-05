import {
  fetchBatimentConstructionByRnbId,
  fetchBatimentGroupeComplet,
  fetchBatimentByCleBan,
  type BdnbBatimentGroupeComplet,
  type BdnbAleaArgile,
} from "@/shared/adapters/bdnb";

/**
 * Données bâtiment enrichies pour l'application
 */
export interface BuildingData {
  // Identifiants
  rnbId: string;
  batimentGroupeId: string;

  // Coordonnées (fournies par le clic sur la carte)
  lat: number;
  lon: number;

  // Aléa argiles
  aleaArgiles: BdnbAleaArgile;

  // Caractéristiques
  anneeConstruction: number | null;
  nombreNiveaux: number | null;
  surfaceHabitable: number | null;

  // Adresse
  adresse: string | null;
  codePostal: string | null;
  commune: string | null;
  codeDepartement: string | null;

  // DPE
  etiquetteEnergie: string | null;
  etiquetteGes: string | null;

  // Données brutes BDNB pour usage avancé
  raw: BdnbBatimentGroupeComplet;
}

/**
 * Récupère les données complètes d'un bâtiment à partir de son ID RNB
 */
export async function getBuildingDataByRnbId(
  rnbId: string,
  coordinates: { lat: number; lon: number }
): Promise<BuildingData> {
  // Étape 1 : Récupérer le batiment_groupe_id depuis l'ID RNB
  const correspondances = await fetchBatimentConstructionByRnbId(rnbId);

  if (correspondances.length === 0) {
    throw new Error(`Aucun bâtiment trouvé pour l'ID RNB: ${rnbId}`);
  }

  const { batiment_groupe_id } = correspondances[0];

  // Étape 2 : Récupérer les données complètes du bâtiment
  const batiments = await fetchBatimentGroupeComplet(batiment_groupe_id);

  if (batiments.length === 0) {
    throw new Error(`Aucune donnée trouvée pour le batiment_groupe_id: ${batiment_groupe_id}`);
  }

  const batiment = batiments[0];

  // Transformer en format application
  return transformBdnbToBuilding(batiment, rnbId, coordinates);
}

/**
 * Récupère les données d'un bâtiment par clé BAN (adresse)
 */
export async function getBuildingDataByCleBan(cleBan: string): Promise<BuildingData | null> {
  const batiments = await fetchBatimentByCleBan(cleBan);

  if (batiments.length === 0) {
    return null;
  }

  const batiment = batiments[0];

  // Sans RNB ni coordonnées précises pour cette méthode
  return transformBdnbToBuilding(batiment, "", { lat: 0, lon: 0 });
}

/**
 * Transforme les données BDNB brutes en format application
 */
function transformBdnbToBuilding(
  batiment: BdnbBatimentGroupeComplet,
  rnbId: string,
  coordinates: { lat: number; lon: number }
): BuildingData {
  return {
    rnbId,
    batimentGroupeId: batiment.batiment_groupe_id,
    lat: coordinates.lat,
    lon: coordinates.lon,
    aleaArgiles: batiment.alea_argiles ? (batiment.alea_argiles.toLowerCase() as BdnbAleaArgile) : null, // Normaliser la casse
    anneeConstruction: batiment.annee_construction ?? null,
    nombreNiveaux: batiment.nb_niveau ?? null,
    surfaceHabitable: batiment.surface_habitable ?? null,
    adresse: batiment.libelle_adr_principale_ban ?? null,
    codePostal: batiment.code_postal ?? null,
    commune: batiment.libelle_commune ?? null,
    codeDepartement: batiment.code_departement ?? null,
    etiquetteEnergie: batiment.dpe_etiquette_energie ?? null,
    etiquetteGes: batiment.dpe_etiquette_ges ?? null,
    raw: batiment,
  };
}

/**
 * Vérifie si un bâtiment est en zone à risque RGA
 */
export function isInRgaZone(aleaArgiles: BdnbAleaArgile): boolean {
  return aleaArgiles !== null;
}

/**
 * Détermine le niveau de risque RGA à partir de l'aléa argiles
 * @param aleaArgiles
 * @returns
 */
export function getRgaRiskLevel(aleaArgiles: BdnbAleaArgile): "fort" | "moyen" | "faible" | "nul" {
  return aleaArgiles ?? "nul";
}
