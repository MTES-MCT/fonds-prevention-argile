import type { StatAvecVariation } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

export interface ActionTypeStat {
  /** Valeur technique de parcours_actions.action_type */
  actionType: string;
  /** Libellé lisible (ACTION_LABELS_BY_VALUE, ou la valeur brute si inconnue) */
  label: string;
  count: number;
  /** Pourcentage par rapport au total d'actions sur la période (ex: 34 pour 34%) */
  pourcentage: number;
  /** Variation en % par rapport à la période précédente (null pour "Depuis le début") */
  variation: number | null;
}

export interface DelaiMoyenStat {
  /** Delai moyen en heures entre l'inscription et la premiere action, null si aucune donnee */
  valeurHeures: number | null;
  variation: number | null;
}

export interface ActiviteStats {
  total: StatAvecVariation;
  demandeursDistincts: StatAvecVariation;
  delaiMoyenPremiereReponse: DelaiMoyenStat;
  /** Demandeurs inscrits sur la periode n'ayant recu aucune action a ce jour */
  demandeursSansReponse: StatAvecVariation;
  parType: ActionTypeStat[];
}
