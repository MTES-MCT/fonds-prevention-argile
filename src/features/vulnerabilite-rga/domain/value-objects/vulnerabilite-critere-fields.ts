import { ALEA_RGA_CRITERE_ID, ALEA_RGA_LABELS, getCritereConfig } from "./grille-categorisation";
import type { PartialVulnerabiliteReponses, ReponseAleaRga } from "../types/vulnerabilite-reponses.types";

/**
 * Une question (ou l'aléa de la carte) = une colonne de la table `vulnerabilite_simulations`.
 * `field` reste un `string` générique (pas `keyof VulnerabiliteSimulation`) pour ne pas faire
 * dépendre ce fichier de domaine du schéma Drizzle — les appelants castent au point d'usage.
 */
export const CRITERE_FIELDS: { critereId: string; field: string }[] = [
  { critereId: "aleaRga", field: "aleaRga" },
  { critereId: "pente_terrain", field: "penteTerrain" },
  { critereId: "reseaux_enterres", field: "reseauxEnterres" },
  { critereId: "gravier_proprete", field: "gravierProprete" },
  { critereId: "gouttieres", field: "gouttieres" },
  { critereId: "recuperateur_eau", field: "recuperateurEau" },
  { critereId: "arbre_proximite", field: "arbreProximite" },
  { critereId: "arbre_essence", field: "arbreEssence" },
  { critereId: "haies", field: "haies" },
  { critereId: "vegetation_pied_facade", field: "vegetationPiedFacade" },
  { critereId: "mitoyennete", field: "mitoyennete" },
  { critereId: "ensoleillement", field: "ensoleillement" },
  { critereId: "source_chaleur_sous_sol", field: "sourceChaleurSousSol" },
];

/** Réponses aplaties par identifiant de critère — forme pivot entre les sections du parcours,
 * la catégorisation et la charge utile envoyée au serveur. */
export type ReponsesParCritere = Record<string, string | undefined>;

/** Aplatit les réponses collectées section par section en `critereId → réponse`. */
export function toReponsesParCritere(answers: PartialVulnerabiliteReponses): ReponsesParCritere {
  return {
    aleaRga: answers.adresse?.aleaRga,
    pente_terrain: answers.eaux?.pente_terrain,
    reseaux_enterres: answers.eaux?.reseaux_enterres,
    gravier_proprete: answers.eaux?.gravier_proprete,
    gouttieres: answers.eaux?.gouttieres,
    recuperateur_eau: answers.eaux?.recuperateur_eau,
    arbre_proximite: answers.vegetation?.arbre_proximite,
    arbre_essence: answers.vegetation?.arbre_essence,
    haies: answers.vegetation?.haies,
    vegetation_pied_facade: answers.vegetation?.vegetation_pied_facade,
    mitoyennete: answers.divers?.mitoyennete,
    ensoleillement: answers.divers?.ensoleillement,
    source_chaleur_sous_sol: answers.divers?.source_chaleur_sous_sol,
  };
}

/** Relit une ligne de `vulnerabilite_simulations` en `critereId → réponse`. */
export function reponsesDepuisColonnes(ligne: object): ReponsesParCritere {
  const colonnes = ligne as Record<string, unknown>;
  return Object.fromEntries(
    CRITERE_FIELDS.map(({ critereId, field }) => {
      const valeur = colonnes[field];
      return [critereId, typeof valeur === "string" ? valeur : undefined];
    })
  );
}

/** Libellés des questions, indépendants des textes UI du simulateur (intro/bullets). */
export const QUESTION_LABELS: Record<string, string> = {
  aleaRga: "Aléa RGA (sol)",
  pente_terrain: "Pente du terrain",
  reseaux_enterres: "Réseaux enterrés",
  gravier_proprete: "Gravier de propreté",
  gouttieres: "Gouttières",
  recuperateur_eau: "Récupérateur d'eau",
  arbre_proximite: "Proximité d'un arbre",
  arbre_essence: "Essence de l'arbre",
  haies: "Haies",
  vegetation_pied_facade: "Végétation en pied de façade",
  mitoyennete: "Mitoyenneté",
  ensoleillement: "Ensoleillement",
  source_chaleur_sous_sol: "Source de chaleur en sous-sol",
};

/** Libellé lisible d'une réponse donnée à une question, ou de l'aléa issu de la carte. */
export function getReponseLabel(critereId: string, reponse: string): string {
  if (critereId === ALEA_RGA_CRITERE_ID) {
    return ALEA_RGA_LABELS[reponse as ReponseAleaRga] ?? reponse;
  }
  return getCritereConfig(critereId)?.reponses.find((r) => r.reponse === reponse)?.label ?? reponse;
}
