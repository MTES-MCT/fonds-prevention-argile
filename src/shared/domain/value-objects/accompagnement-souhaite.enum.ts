/**
 * Ce que l'Aller-vers a appris du demandeur sur son accompagnement, au moment de qualifier
 * un prospect éligible dans un département où l'AMO n'est pas imposé.
 *
 * `INCONNU` n'est pas une absence de réponse : c'est une réponse, celle qui laisse
 * explicitement la main au demandeur. L'absence, elle, se dit `null` — la question n'a pas
 * été posée (département à AMO imposé, autre décision, ou qualification antérieure à ce champ).
 */
export enum AccompagnementSouhaite {
  /** Le demandeur veut être accompagné : l'AMO du territoire est sollicitée pour lui. */
  ACCOMPAGNEMENT = "accompagnement",
  /** Le demandeur gère seul : le parcours passe en autonomie sans repasser par lui. */
  AUTONOMIE = "autonomie",
  /** Le demandeur n'a pas tranché : le choix lui reste proposé sur son espace. */
  INCONNU = "inconnu",
}

export const ACCOMPAGNEMENT_SOUHAITE_VALUES = Object.values(AccompagnementSouhaite);

export function isAccompagnementSouhaite(valeur: string | null | undefined): valeur is AccompagnementSouhaite {
  return valeur !== null && valeur !== undefined && ACCOMPAGNEMENT_SOUHAITE_VALUES.includes(valeur as never);
}
