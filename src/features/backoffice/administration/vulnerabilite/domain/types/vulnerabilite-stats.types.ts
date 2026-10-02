import type { CategorieAffichee } from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";

export interface ReponseDistribution {
  reponse: string;
  label: string;
  count: number;
  /** Pourcentage par rapport au total des réponses données pour ce critère (ex: 42 pour 42%). */
  pourcentage: number;
}

export interface CritereReponsesStats {
  critereId: string;
  label: string;
  /** Nombre de simulations ayant répondu à ce critère (dénominateur des pourcentages). */
  total: number;
  reponses: ReponseDistribution[];
}

/** Nombre moyen de réponses de chaque catégorie par simulation ; null si aucune simulation sur la période. */
export type VulnerabilitePointsMoyens = Record<CategorieAffichee, number | null>;

export interface VulnerabiliteStatsBdd {
  totalSimulations: number;
  reponses: CritereReponsesStats[];
  pointsMoyens: VulnerabilitePointsMoyens;
}

export interface VulnerabiliteTopDepartement {
  /** Code officiel (ex: "03") */
  codeDepartement: string;
  nomDepartement: string;
  simulations: number;
}
