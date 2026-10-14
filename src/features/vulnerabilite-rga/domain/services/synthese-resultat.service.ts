import type { ReponseAleaRga } from "../types/vulnerabilite-reponses.types";
import type { ComptePoints } from "./categorisation.service";

export type NiveauSynthese = "critique" | "vigilance" | "aucun";

export interface SyntheseResultat {
  niveau: NiveauSynthese;
  /** Couleur du callout : un cran sous le niveau là où la carte annonce peu ou pas d'argile. */
  accent: NiveauSynthese;
  /** Porte le niveau en toutes lettres : l'information ne repose pas sur la seule couleur. */
  titre: string;
  texte: string;
  /** Même texte découpé, pour mettre l'aléa et les comptes de points en gras à l'écran. */
  segments: SegmentTexte[];
}

export interface SegmentTexte {
  texte: string;
  gras?: boolean;
}

const TITRES: Record<NiveauSynthese, string> = {
  critique: "Points critiques identifiés",
  vigilance: "Points de vigilance identifiés",
  aucun: "Aucun point critique ni de vigilance",
};

const ZONES_ALEA: Record<ReponseAleaRga, string> = {
  fort: "en zone d'aléa fort",
  moyen: "en zone d'aléa moyen",
  faible: "en zone d'aléa faible",
  nul: "hors zone argileuse",
};

function phraseAlea(alea: ReponseAleaRga): SegmentTexte[] {
  return [{ texte: "Votre maison est située " }, { texte: ZONES_ALEA[alea], gras: true }, { texte: "." }];
}

function accorder(nombre: number, singulier: string, pluriel: string): SegmentTexte {
  return { texte: `${nombre} ${nombre > 1 ? pluriel : singulier}`, gras: true };
}

function phrasePoints(critiques: number, vigilances: number): SegmentTexte[] {
  const partCritique = accorder(critiques, "point critique", "points critiques");
  const partVigilance = accorder(vigilances, "point de vigilance", "points de vigilance");

  if (critiques === 0 && vigilances === 0) {
    return [{ texte: "Nous n'avons identifié aucun point critique ni point de vigilance." }];
  }
  if (critiques === 0)
    return [{ texte: "Nous n'avons identifié aucun point critique, mais " }, partVigilance, { texte: "." }];
  if (vigilances === 0)
    return [{ texte: "Nous avons identifié " }, partCritique, { texte: " et aucun point de vigilance." }];
  return [{ texte: "Nous avons identifié " }, partCritique, { texte: " et " }, partVigilance, { texte: "." }];
}

// La carte d'aléa est une estimation : en zone faible ou hors zone, on relativise les points sans les retirer.
const SUITE_ESTIMATION =
  "La carte d'aléa reste une estimation : si le sol sous votre maison s'avère non argileux, ces points sont sans " +
  "conséquence ; s'il est argileux, ils comptent et méritent votre attention, à commencer par les points critiques.";
const PHRASES_ALEA_ATTENUE: Partial<Record<ReponseAleaRga, string>> = {
  nul: `Hors zone argileuse, ces points ont a priori peu d'impact sur votre maison. ${SUITE_ESTIMATION}`,
  faible: `En zone d'aléa faible, l'argile est peu présente ou peu sensible : ces points ont a priori un impact limité. ${SUITE_ESTIMATION}`,
};

export function getNiveauSynthese(compte: ComptePoints): NiveauSynthese {
  if (compte.critique > 0) return "critique";
  if (compte.vigilance > 0) return "vigilance";
  return "aucun";
}

/** Synthèse du résultat, partagée entre l'écran et le PDF. L'aléa n'y est qu'une donnée de contexte. */
export function buildSyntheseResultat(aleaRga: ReponseAleaRga | undefined, compte: ComptePoints): SyntheseResultat {
  const niveau = getNiveauSynthese(compte);
  const aDesPointsATraiter = compte.critique + compte.vigilance + compte.a_verifier > 0;
  const phraseAttenuee = aleaRga ? PHRASES_ALEA_ATTENUE[aleaRga] : undefined;
  const phrases = [
    aleaRga ? phraseAlea(aleaRga) : null,
    phrasePoints(compte.critique, compte.vigilance),
    phraseAttenuee && aDesPointsATraiter ? [{ texte: phraseAttenuee }] : null,
  ].filter((phrase): phrase is SegmentTexte[] => phrase !== null);
  const segments = phrases.flatMap((phrase, i) => (i === 0 ? phrase : [{ texte: " " }, ...phrase]));
  const accent = phraseAttenuee && niveau === "critique" ? "vigilance" : niveau;

  return {
    niveau,
    accent,
    titre: TITRES[niveau],
    texte: segments.map((segment) => segment.texte).join(""),
    segments,
  };
}
