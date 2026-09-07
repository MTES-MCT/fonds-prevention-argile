import { ESSENCES_AGRESSIVITE, getCritereConfig } from "./grille-ponderation";

/**
 * Un critère de la grille de pondération = une colonne de la table `vulnerabilite_simulations`.
 * `field` reste un `string` générique (pas `keyof VulnerabiliteSimulation`) pour ne pas faire
 * dépendre ce fichier de domaine du schéma Drizzle — les appelants castent au point d'usage.
 */
export const CRITERE_FIELDS: { critereId: string; field: string }[] = [
  { critereId: "aleaRga", field: "aleaRga" },
  { critereId: "pente_terrain", field: "penteTerrain" },
  { critereId: "reseaux_enterres", field: "reseauxEnterres" },
  { critereId: "gravier_proprete", field: "gravierProprete" },
  { critereId: "gouttieres", field: "gouttieres" },
  { critereId: "arbre_proximite", field: "arbreProximite" },
  { critereId: "arbre_essence", field: "arbreEssence" },
  { critereId: "haies", field: "haies" },
  { critereId: "vegetation_pied_facade", field: "vegetationPiedFacade" },
  { critereId: "mitoyennete", field: "mitoyennete" },
  { critereId: "ensoleillement", field: "ensoleillement" },
];

/** Libellés des questions, indépendants des textes UI du simulateur (intro/bullets). */
export const QUESTION_LABELS: Record<string, string> = {
  aleaRga: "Aléa RGA (sol)",
  pente_terrain: "Pente du terrain",
  reseaux_enterres: "Réseaux enterrés",
  gravier_proprete: "Gravier de propreté",
  gouttieres: "Gouttières",
  arbre_proximite: "Proximité d'un arbre",
  arbre_essence: "Essence de l'arbre",
  haies: "Haies",
  vegetation_pied_facade: "Végétation en pied de façade",
  mitoyennete: "Mitoyenneté",
  ensoleillement: "Ensoleillement",
};

/** Libellé lisible d'une réponse donnée à un critère (bareme, ou table d'essences d'arbre à part). */
export function getReponseLabel(critereId: string, reponse: string): string {
  if (critereId === "arbre_essence") {
    return ESSENCES_AGRESSIVITE[reponse]?.label ?? reponse;
  }
  return getCritereConfig(critereId)?.bareme.find((b) => b.reponse === reponse)?.label ?? reponse;
}
