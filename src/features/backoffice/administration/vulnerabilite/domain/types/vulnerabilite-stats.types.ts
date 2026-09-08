import type { CategorieVulnerabilite } from "@/features/vulnerabilite-rga/domain/value-objects/grille-ponderation";

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

export interface VulnerabiliteScoreMoyen {
  /** null si aucune simulation sur la période. */
  global: number | null;
  parCategorie: Record<CategorieVulnerabilite, number | null>;
}

export interface VulnerabiliteStatsBdd {
  totalSimulations: number;
  reponses: CritereReponsesStats[];
  scoreMoyen: VulnerabiliteScoreMoyen;
}

export interface VulnerabiliteTopDepartement {
  /** Code officiel (ex: "03") */
  codeDepartement: string;
  nomDepartement: string;
  simulations: number;
}
