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
  raw: BdnbBatimentGroupeComplet | null;

  /**
   * true si BDNB n'a pas répondu (panne, timeout, bâtiment pas encore référencé) : les champs
   * ci-dessus sont à null et l'utilisateur doit les compléter lui-même.
   */
  donneesIndisponibles?: boolean;

  /**
   * true si même le calcul d'aléa interne (indépendant de BDNB) a échoué. Dans ce cas
   * `aleaArgiles` vaut null par défaut mais NE DOIT PAS être interprété comme "hors zone"
   * (cf. checkZoneForte) : l'aléa est réellement inconnu, pas négatif.
   */
  aleaIndetermine?: boolean;
}

/**
 * Récupère les données complètes d'un bâtiment à partir de son ID RNB.
 *
 * Ne lève jamais d'exception pour une indisponibilité de BDNB (réseau, timeout, bâtiment pas
 * encore référencé) : renvoie à la place un squelette avec `donneesIndisponibles: true`, que
 * l'appelant peut proposer à l'utilisateur de compléter manuellement plutôt que de bloquer le
 * parcours. L'aléa RGA est déterminé via notre propre requête PostGIS (`fetchRga2026Alea`),
 * indépendante de BDNB, pour ne jamais dépendre de sa disponibilité sur ce champ décisif pour
 * l'éligibilité.
 */
export async function getBuildingDataByRnbId(
  rnbId: string,
  coordinates: { lat: number; lon: number }
): Promise<BuildingData> {
  let batiment: BdnbBatimentGroupeComplet | null = null;

  try {
    const correspondances = await fetchBatimentConstructionByRnbId(rnbId);
    if (correspondances.length > 0) {
      const batiments = await fetchBatimentGroupeComplet(correspondances[0].batiment_groupe_id);
      batiment = batiments[0] ?? null;
    }
  } catch {
    batiment = null;
  }

  let aleaDetermine: BdnbAleaArgile = null;
  let aleaIndetermine = false;
  try {
    aleaDetermine = await fetchRga2026Alea(coordinates.lat, coordinates.lon);
  } catch {
    aleaIndetermine = true;
  }

  if (batiment) {
    const buildingData = transformBdnbToBuilding(batiment, rnbId, coordinates);
    // Override alea avec les données RGA 2026 (PostGIS) si le calcul a réussi ; sinon on
    // garde l'alea déjà porté par BDNB plutôt que de l'écraser par une valeur inconnue.
    if (!aleaIndetermine) {
      buildingData.aleaArgiles = aleaDetermine;
    }
    return buildingData;
  }

  return buildDonneesIndisponibles(rnbId, coordinates, aleaDetermine, aleaIndetermine);
}

/**
 * Squelette de données à compléter manuellement, pour l'échappatoire "je ne trouve pas mon
 * bâtiment" proposée quand la carte reste trop longtemps sans réagir (ex. tuiles RNB lentes à
 * charger sur un réseau dégradé). N'appelle jamais BDNB ni RNB : uniquement notre propre API
 * d'aléa, à partir des coordonnées de l'adresse déjà recherchée.
 */
export async function getBuildingDataFallback(coordinates: { lat: number; lon: number }): Promise<BuildingData> {
  let aleaDetermine: BdnbAleaArgile = null;
  let aleaIndetermine = false;
  try {
    aleaDetermine = await fetchRga2026Alea(coordinates.lat, coordinates.lon);
  } catch {
    aleaIndetermine = true;
  }

  return buildDonneesIndisponibles("", coordinates, aleaDetermine, aleaIndetermine);
}

function buildDonneesIndisponibles(
  rnbId: string,
  coordinates: { lat: number; lon: number },
  aleaArgiles: BdnbAleaArgile,
  aleaIndetermine: boolean
): BuildingData {
  return {
    rnbId,
    batimentGroupeId: "",
    lat: coordinates.lat,
    lon: coordinates.lon,
    aleaArgiles,
    anneeConstruction: null,
    nombreNiveaux: null,
    surfaceHabitable: null,
    adresse: null,
    codePostal: null,
    commune: null,
    codeDepartement: null,
    etiquetteEnergie: null,
    etiquetteGes: null,
    raw: null,
    donneesIndisponibles: true,
    aleaIndetermine,
  };
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
 * Appel client-side à l'API PostGIS pour obtenir l'aléa RGA 2026.
 * Lève une exception en cas d'échec (réseau, HTTP) : à l'appelant de distinguer un aléa
 * réellement "null" (hors zone) d'un aléa qu'on n'a simplement pas pu déterminer.
 */
async function fetchRga2026Alea(lat: number, lon: number): Promise<BdnbAleaArgile> {
  const response = await fetch(`/api/rga/alea?lat=${lat}&lon=${lon}`);
  if (!response.ok) {
    throw new Error(`Erreur API RGA (alea): ${response.status}`);
  }
  const data = await response.json();
  return data.alea ?? null;
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
