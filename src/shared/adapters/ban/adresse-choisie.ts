import type { BanFeature } from "./ban.types";
import { mapBanFeatureToAddressData } from "./ban.adapter";

/**
 * Adresse que l'usager vient de choisir, dans le format commun aux deux simulateurs publics
 * (éligibilité et vulnérabilité), pour qu'il ne la ressaisisse pas en passant de l'un à l'autre.
 */
export interface AdresseChoisie {
  /** Libellé BAN complet, tel qu'affiché dans le champ de recherche. */
  label: string;
  lat: number;
  lon: number;
  clefBan: string;
  codeInsee: string;
  communeNom: string;
  codeDepartement: string;
  /** Bâtiment retenu sur la carte ; null tant qu'aucun n'a été sélectionné. */
  rnb: string | null;
  /** Inconnu quand l'adresse vient du simulateur de vulnérabilité, qui n'en a pas besoin. */
  codeEpci: string | null;
}

interface OptionsAdresseChoisie {
  rnb: string | null;
  /** Coordonnées du bâtiment sélectionné ; à défaut, celles de l'adresse BAN. */
  coordonnees?: { lat: number; lon: number };
  codeEpci?: string | null;
}

export function adresseChoisieDepuisBan(feature: BanFeature, options: OptionsAdresseChoisie): AdresseChoisie {
  const adresse = mapBanFeatureToAddressData(feature);

  return {
    label: feature.properties.label,
    lat: options.coordonnees?.lat ?? adresse.coordinates.lat,
    lon: options.coordonnees?.lon ?? adresse.coordinates.lon,
    clefBan: adresse.clefBan,
    codeInsee: adresse.codeCommune,
    communeNom: adresse.nomCommune,
    codeDepartement: adresse.codeDepartement ?? "",
    rnb: options.rnb,
    codeEpci: options.codeEpci ?? null,
  };
}

/** Reconstruit un résultat de recherche BAN pour rouvrir la carte sans nouvel appel réseau. */
export function banFeatureDepuisAdresse(adresse: AdresseChoisie): BanFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [adresse.lon, adresse.lat] },
    properties: {
      label: adresse.label,
      score: 1,
      id: adresse.clefBan,
      type: "housenumber",
      name: adresse.label,
      postcode: "",
      citycode: adresse.codeInsee,
      city: adresse.communeNom,
      context: adresse.codeDepartement,
    },
  };
}
