import { DEPARTEMENTS, normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { isDepartementEligible } from "@/shared/constants/rga.constants";
import type {
  DepartementStats,
  TopDepartementsMatomo,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

export type PerimetreDepartements = "tous" | "pilotes" | "hors-pilotes";

export interface LigneSimulationsDepartement {
  codeDepartement: string;
  nomDepartement: string;
  /** `null` pour la ligne « non renseigné », qui n'appartient à aucun des deux périmètres. */
  pilote: boolean | null;
  simulations: number;
  eligibles: number;
  nonEligibles: number;
  pourcentageEligibles: number;
  comptesCrees: number;
  dossiersDN: number;
}

export type TotalSimulationsDepartements = Omit<
  LigneSimulationsDepartement,
  "codeDepartement" | "nomDepartement" | "pilote"
>;

export function estCodeDepartementConnu(code: string): boolean {
  return DEPARTEMENTS[normalizeCodeDepartement(code)] !== undefined;
}

function pourcentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function construireLignesSimulationsDepartement(stats: DepartementStats[]): LigneSimulationsDepartement[] {
  return stats
    .map((d) => ({
      codeDepartement: d.codeDepartement,
      nomDepartement: d.nomDepartement,
      pilote: isDepartementEligible(d.codeDepartement),
      simulations: d.simulations,
      eligibles: d.simulationsEligibles,
      nonEligibles: Math.max(0, d.simulations - d.simulationsEligibles),
      pourcentageEligibles: pourcentage(d.simulationsEligibles, d.simulations),
      comptesCrees: d.comptesCrees,
      dossiersDN: d.dossiersDN,
    }))
    .sort((a, b) => b.simulations - a.simulations || a.codeDepartement.localeCompare(b.codeDepartement));
}

export const LIBELLE_NON_RENSEIGNE = "Département non renseigné";

/** Lignes affichées : la ligne « non renseigné » ne figure que sur « Tous », pour que le total y rejoigne l'entonnoir. */
export function lignesAffichees(
  lignes: LigneSimulationsDepartement[],
  nonRenseigne: TopDepartementsMatomo["nonRenseigne"] | null,
  perimetre: PerimetreDepartements
): LigneSimulationsDepartement[] {
  const filtrees = filtrerParPerimetre(lignes, perimetre);
  if (perimetre !== "tous" || !nonRenseigne || nonRenseigne.simulations === 0) return filtrees;
  return [
    ...filtrees,
    {
      codeDepartement: "",
      nomDepartement: LIBELLE_NON_RENSEIGNE,
      pilote: null,
      simulations: nonRenseigne.simulations,
      eligibles: nonRenseigne.simulationsEligibles,
      nonEligibles: nonRenseigne.simulations - nonRenseigne.simulationsEligibles,
      pourcentageEligibles: pourcentage(nonRenseigne.simulationsEligibles, nonRenseigne.simulations),
      comptesCrees: 0,
      dossiersDN: 0,
    },
  ];
}

export function filtrerParPerimetre(
  lignes: LigneSimulationsDepartement[],
  perimetre: PerimetreDepartements
): LigneSimulationsDepartement[] {
  if (perimetre === "tous") return lignes;
  return lignes.filter((l) => l.pilote === (perimetre === "pilotes"));
}

export function totaliserSimulations(lignes: LigneSimulationsDepartement[]): TotalSimulationsDepartements {
  const total = lignes.reduce(
    (acc, l) => ({
      simulations: acc.simulations + l.simulations,
      eligibles: acc.eligibles + l.eligibles,
      nonEligibles: acc.nonEligibles + l.nonEligibles,
      comptesCrees: acc.comptesCrees + l.comptesCrees,
      dossiersDN: acc.dossiersDN + l.dossiersDN,
    }),
    { simulations: 0, eligibles: 0, nonEligibles: 0, comptesCrees: 0, dossiersDN: 0 }
  );
  return { ...total, pourcentageEligibles: pourcentage(total.eligibles, total.simulations) };
}

const ENTETES_CSV = [
  "Code département",
  "Département",
  "Département pilote",
  "Simulations",
  "Éligibles",
  "Non éligibles",
  "Taux d'éligibilité (%)",
  "Comptes créés",
  "Dossiers DN créés",
];

function champCsv(valeur: string | number): string {
  const texte = String(valeur);
  return /[";\r\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

// Point-virgule et BOM : c'est ce qu'Excel attend pour ouvrir un CSV français sans assistant d'import.
export function versCsvSimulationsDepartement(lignes: LigneSimulationsDepartement[]): string {
  const corps = lignes.map((l) =>
    [
      l.codeDepartement,
      l.nomDepartement,
      l.pilote === null ? "" : l.pilote ? "Oui" : "Non",
      l.simulations,
      l.eligibles,
      l.nonEligibles,
      l.pourcentageEligibles,
      l.comptesCrees,
      l.dossiersDN,
    ]
      .map(champCsv)
      .join(";")
  );
  return "﻿" + [ENTETES_CSV.map(champCsv).join(";"), ...corps].join("\r\n") + "\r\n";
}
