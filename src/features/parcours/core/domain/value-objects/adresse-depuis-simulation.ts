import type { AdresseChoisie } from "@/shared/adapters/ban";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { asString } from "@/shared/utils";

/**
 * Adresse d'une simulation d'éligibilité, au format commun aux simulateurs : elle évite au
 * demandeur connecté de la ressaisir pour le simulateur de vulnérabilité. Null quand il
 * manque de quoi rouvrir la carte (coordonnées, clef BAN, commune).
 */
export function adresseChoisieDepuisSimulation(
  rgaData: PartialRGASimulationData | null | undefined
): AdresseChoisie | null {
  const logement = rgaData?.logement;
  const adresse = asString(logement?.adresse);
  const communeNom = asString(logement?.commune_nom) ?? "";
  const codeInsee = asString(logement?.commune);
  const clefBan = asString(logement?.clef_ban);
  const [lat, lon] = (asString(logement?.coordonnees) ?? "").split(",").map(Number);

  if (!adresse || !codeInsee || !clefBan || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    label: communeNom && !adresse.includes(communeNom) ? `${adresse}, ${communeNom}` : adresse,
    lat,
    lon,
    clefBan,
    codeInsee,
    communeNom,
    codeDepartement: asString(logement?.code_departement) ?? "",
    rnb: asString(logement?.rnb) || null,
    codeEpci: asString(logement?.epci) || null,
  };
}
