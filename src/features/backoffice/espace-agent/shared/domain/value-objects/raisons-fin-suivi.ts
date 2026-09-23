/**
 * Raisons proposées quand un professionnel met fin au suivi d'un dossier. Deux familles aux
 * conséquences opposées : presque toutes archivent, une seule laisse le dossier vivant.
 */
export const RAISONS_ARCHIVAGE: readonly string[] = [
  "Le demandeur n'est pas éligible",
  "Reste à charge trop élevé",
  "Le demandeur a abandonné le projet",
  "Le demandeur ne donne pas de réponse",
  "Fausse déclaration / documents falsifiés",
  "Autre",
];

/** Le demandeur continue son parcours, sans AMO : rien n'est archivé. */
export const RAISON_POURSUITE_AUTONOME = "Le demandeur souhaite poursuivre sans accompagnement";

export const RAISONS_POURSUITE_AUTONOME: readonly string[] = [RAISON_POURSUITE_AUTONOME];

export interface GroupeRaisons {
  /** Libellé de l'`optgroup` : il annonce la conséquence, jamais une catégorie abstraite. */
  label: string;
  raisons: readonly string[];
}

const GROUPE_POURSUITE_AUTONOME: GroupeRaisons = {
  label: "Le demandeur poursuit son parcours seul",
  raisons: RAISONS_POURSUITE_AUTONOME,
};

const GROUPE_ARCHIVAGE: GroupeRaisons = {
  label: "Le dossier sera archivé",
  raisons: RAISONS_ARCHIVAGE,
};

/**
 * Sous-listes de « ma structure ne va pas l'accompagner ». L'autonomie est retirée là où l'AMO
 * est imposé : le demandeur n'y a personne pour reprendre le dossier (cf. ADR-0037).
 */
export function getGroupesRaisonsSansAccompagnement(autonomiePossible: boolean): readonly GroupeRaisons[] {
  return autonomiePossible ? [GROUPE_POURSUITE_AUTONOME, GROUPE_ARCHIVAGE] : [GROUPE_ARCHIVAGE];
}

/** La raison décide de la suite : détachement de l'AMO plutôt qu'archivage. */
export function estRaisonPoursuiteAutonome(raison: string): boolean {
  return RAISONS_POURSUITE_AUTONOME.includes(raison.trim());
}
