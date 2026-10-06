import {
  DEPARTEMENTS,
  normalizeCodeDepartement,
  toOfficialCodeDepartement,
} from "@/shared/constants/departements.constants";
import { isDepartementEligible } from "@/shared/constants/rga.constants";
import type { DepartementStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

export interface CompteurSimulations {
  total: number;
  eligible: number;
  nonEligible: number;
}

export type PerimetreDepartements = "tous" | "pilotes" | "hors-pilotes";

export interface LigneSimulationsDepartement {
  codeDepartement: string;
  nomDepartement: string;
  pilote: boolean;
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

/** Fusionne les variantes d'un même code ("3" / "03") et écarte les valeurs qui ne sont pas un département. */
export function regrouperSimulationsParDepartement(
  parValeur: Map<string, CompteurSimulations>
): Map<string, CompteurSimulations> {
  const regroupe = new Map<string, CompteurSimulations>();
  for (const [valeur, compteur] of parValeur) {
    if (!estCodeDepartementConnu(valeur)) continue;
    const code = toOfficialCodeDepartement(valeur);
    const cumul = regroupe.get(code) ?? { total: 0, eligible: 0, nonEligible: 0 };
    regroupe.set(code, {
      total: cumul.total + compteur.total,
      eligible: cumul.eligible + compteur.eligible,
      nonEligible: cumul.nonEligible + compteur.nonEligible,
    });
  }
  return regroupe;
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
      l.pilote ? "Oui" : "Non",
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
