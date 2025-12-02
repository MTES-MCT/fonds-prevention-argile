import type { BdnbBatimentConstruction, BdnbBatimentGroupeComplet } from "./bdnb.types";

const BDNB_API_BASE_URL = "https://api.bdnb.io/v1/bdnb/donnees";

/**
 * Client HTTP pour l'API BDNB
 */

/**
 * Récupère la correspondance RNB -> batiment_groupe_id
 */
export async function fetchBatimentConstructionByRnbId(rnbId: string): Promise<BdnbBatimentConstruction[]> {
  const url = `${BDNB_API_BASE_URL}/batiment_construction?rnb_id=eq.${encodeURIComponent(rnbId)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API BDNB (batiment_construction): ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère les données complètes d'un bâtiment par son batiment_groupe_id
 */
export async function fetchBatimentGroupeComplet(batimentGroupeId: string): Promise<BdnbBatimentGroupeComplet[]> {
  const url = `${BDNB_API_BASE_URL}/batiment_groupe_complet?batiment_groupe_id=eq.${encodeURIComponent(batimentGroupeId)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API BDNB (batiment_groupe_complet): ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère les données d'un bâtiment par clé BAN (adresse)
 * Utile pour pré-remplir des données avant sélection RNB
 */
export async function fetchBatimentByCleBan(cleBan: string): Promise<BdnbBatimentGroupeComplet[]> {
  const url = `${BDNB_API_BASE_URL}/batiment_groupe_complet/adresse?cle_interop_adr=eq.${encodeURIComponent(cleBan)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API BDNB (adresse): ${response.status} ${response.statusText}`);
  }

  return response.json();
}
