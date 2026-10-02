import type { ReponseAleaRga } from "../types/vulnerabilite-reponses.types";
import type { ComptePoints } from "./categorisation.service";

export type NiveauSynthese = "critique" | "vigilance" | "aucun";

export interface SyntheseResultat {
  niveau: NiveauSynthese;
  /** Porte le niveau en toutes lettres : l'information ne repose pas sur la seule couleur. */
  titre: string;
  texte: string;
}

const TITRES: Record<NiveauSynthese, string> = {
  critique: "Points critiques identifiés",
  vigilance: "Points de vigilance identifiés",
  aucun: "Aucun point critique ni de vigilance",
};

const PHRASES_ALEA: Record<ReponseAleaRga, string> = {
  fort: "Votre maison est située en zone d'aléa fort.",
  moyen: "Votre maison est située en zone d'aléa moyen.",
  faible: "Votre maison est située en zone d'aléa faible.",
  nul: "Votre maison est située hors zone argileuse.",
};

function accorder(nombre: number, singulier: string, pluriel: string): string {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

function phrasePoints(critiques: number, vigilances: number): string {
  const partCritique = accorder(critiques, "point critique", "points critiques");
  const partVigilance = accorder(vigilances, "point de vigilance", "points de vigilance");

  if (critiques === 0 && vigilances === 0) return "Nous n'avons identifié aucun point critique ni point de vigilance.";
  if (critiques === 0) return `Nous n'avons identifié aucun point critique, mais ${partVigilance}.`;
  if (vigilances === 0) return `Nous avons identifié ${partCritique} et aucun point de vigilance.`;
  return `Nous avons identifié ${partCritique} et ${partVigilance}.`;
}

export function getNiveauSynthese(compte: ComptePoints): NiveauSynthese {
  if (compte.critique > 0) return "critique";
  if (compte.vigilance > 0) return "vigilance";
  return "aucun";
}

/** Synthèse du résultat, partagée entre l'écran et le PDF. L'aléa n'y est qu'une donnée de contexte. */
export function buildSyntheseResultat(aleaRga: ReponseAleaRga | undefined, compte: ComptePoints): SyntheseResultat {
  const niveau = getNiveauSynthese(compte);
  const phrases = [aleaRga ? PHRASES_ALEA[aleaRga] : null, phrasePoints(compte.critique, compte.vigilance)];

  return { niveau, titre: TITRES[niveau], texte: phrases.filter(Boolean).join(" ") };
}
