import { z } from "zod";
import { ALEA_RGA_CRITERE_ID, ALEA_RGA_LABELS, CRITERES_CONFIG, type CritereConfig } from "./grille-categorisation";
import { toReponsesParCritere, type ReponsesParCritere } from "./vulnerabilite-critere-fields";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

/** Métropole (01-95, 2A/2B) et outre-mer (971-976, 984-988). */
const CODE_DEPARTEMENT_REGEX = /^(2[AB]|[0-9]{2,3})$/;

function reponsesValides(critere: CritereConfig): [string, ...string[]] {
  return critere.reponses.map((r) => r.reponse) as [string, ...string[]];
}

/**
 * Charge utile envoyée par le navigateur à `enregistrerResultatVulnerabiliteAction`.
 *
 * Deux propriétés à préserver :
 * - **anonymat** (ADR-0031) : seul le code département sort du navigateur, jamais l'adresse,
 *   les coordonnées, la clé BAN ou l'identifiant RNB, qui ne servent qu'à l'affichage ;
 * - **non falsifiable** : aucune catégorie n'est acceptée du client, seules des réponses
 *   connues de la grille le sont. La page étant publique et non authentifiée, tout ce qui est
 *   accepté tel quel finit dans les stats.
 *
 * Les valeurs acceptées sont dérivées de la grille de catégorisation : elle reste le seul
 * fichier à modifier pour ajuster la méthode (ADR-0045).
 */
export const vulnerabiliteSimulationPayloadSchema = z.object({
  codeDepartement: z.string().regex(CODE_DEPARTEMENT_REGEX).nullable(),
  reponses: z.object(
    Object.fromEntries([
      [ALEA_RGA_CRITERE_ID, z.enum(Object.keys(ALEA_RGA_LABELS) as [string, ...string[]]).optional()],
      ...CRITERES_CONFIG.map((critere) => [critere.id, z.enum(reponsesValides(critere)).optional()] as const),
    ])
  ),
});

export type VulnerabiliteSimulationPayload = z.infer<typeof vulnerabiliteSimulationPayloadSchema>;

/** Réduit les réponses du parcours à ce que le serveur a le droit de connaître. */
export function toSimulationPayload(answers: PartialVulnerabiliteReponses): VulnerabiliteSimulationPayload {
  return {
    codeDepartement: answers.adresse?.codeDepartement ?? null,
    reponses: toReponsesParCritere(answers) as ReponsesParCritere,
  };
}
