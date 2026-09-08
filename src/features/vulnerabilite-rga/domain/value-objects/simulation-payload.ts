import { z } from "zod";
import { CRITERES_CONFIG, ESSENCES_AGRESSIVITE, getCritereConfig } from "./grille-ponderation";
import { toReponsesParCritere, type ReponsesParCritere } from "./vulnerabilite-critere-fields";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

/** Métropole (01-95, 2A/2B) et outre-mer (971-976, 984-988). */
const CODE_DEPARTEMENT_REGEX = /^(2[AB]|[0-9]{2,3})$/;

/** Valeurs acceptées pour un critère : son barème, ou la table d'essences pour `arbre_essence`. */
function reponsesValides(critereId: string): [string, ...string[]] {
  const valeurs =
    critereId === "arbre_essence"
      ? Object.keys(ESSENCES_AGRESSIVITE)
      : (getCritereConfig(critereId)?.bareme ?? []).map((b) => b.reponse);

  return valeurs as [string, ...string[]];
}

/**
 * Charge utile envoyée par le navigateur à `enregistrerResultatVulnerabiliteAction`.
 *
 * Deux propriétés à préserver :
 * - **anonymat** (ADR-0031) : seul le code département sort du navigateur, jamais l'adresse,
 *   les coordonnées, la clé BAN ou l'identifiant RNB, qui ne servent qu'à l'affichage ;
 * - **non falsifiable** : aucun score n'est accepté du client, le serveur le recalcule à partir
 *   des réponses validées ici. La page étant publique et non authentifiée, tout ce qui est
 *   accepté tel quel finit dans les stats qui servent à calibrer la grille.
 *
 * Les valeurs acceptées sont dérivées de la grille de pondération : elle reste le seul fichier
 * à modifier pour ajuster la méthode (ADR-0030).
 */
export const vulnerabiliteSimulationPayloadSchema = z.object({
  codeDepartement: z.string().regex(CODE_DEPARTEMENT_REGEX).nullable(),
  reponses: z.object(
    Object.fromEntries(CRITERES_CONFIG.map((critere) => [critere.id, z.enum(reponsesValides(critere.id)).optional()]))
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
