import { MIN_QUERY_LENGTH, searchAddress } from "./ban.adapter";
import type { BanFeature } from "./ban.types";

/** Adresse fournie par l'intégrateur d'une iframe, dans le fragment d'URL (`#adresse=...&rnb=...`). */
export interface AdresseTransmise {
  texte: string;
  rnb: string | null;
}

export type ResolutionAdresseTransmise =
  { statut: "resolue"; feature: BanFeature; rnb: string | null } | { statut: "a_choisir"; texte: string };

const LONGUEUR_MAX = 200;
const RNB_REGEX = /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){2}$/;

// Au-dessous, ou sans écart net avec la 2e réponse, l'usager choisit lui-même.
const SCORE_MIN_RESOLUTION = 0.85;
const ECART_MIN_AVEC_SECOND = 0.05;

export function lireAdresseTransmise(hash: string): AdresseTransmise | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  // eslint-disable-next-line no-control-regex
  const texte = (params.get("adresse") ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (texte.length < MIN_QUERY_LENGTH || texte.length > LONGUEUR_MAX) return null;

  const rnb = params.get("rnb")?.trim() ?? "";
  return { texte, rnb: RNB_REGEX.test(rnb) ? rnb : null };
}

export async function resoudreAdresseTransmise(
  adresse: AdresseTransmise,
  recherche: typeof searchAddress = searchAddress
): Promise<ResolutionAdresseTransmise> {
  const [premier, second] = await recherche(adresse.texte);
  const certain =
    premier !== undefined &&
    premier.properties.type === "housenumber" &&
    premier.properties.score >= SCORE_MIN_RESOLUTION &&
    (second === undefined || premier.properties.score - second.properties.score >= ECART_MIN_AVEC_SECOND);

  return certain
    ? { statut: "resolue", feature: premier, rnb: adresse.rnb }
    : { statut: "a_choisir", texte: adresse.texte };
}
