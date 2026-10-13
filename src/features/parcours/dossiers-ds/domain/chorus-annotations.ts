import type { StatutChorus, StatutsChorus } from "@/shared/domain/value-objects/bilan-annotations-dn";
import type { AnnotationLue } from "../adapters/graphql/types";
import { idsAnnotationsChorus } from "./value-objects/ds-annotations";
import type { ColonnesChorus } from "./value-objects/suivi-chorus";

export type MajChorus = Partial<ColonnesChorus>;

function lire(annotations: AnnotationLue[], id: string | undefined): string | null {
  if (!id) return null;
  return annotations.find((a) => a.champDescriptorId === id)?.stringValue?.trim() || null;
}

// Les numéros sont des entiers côté DN : toute autre forme est ignorée plutôt que stockée telle quelle.
function parserNumero(brut: string | null): string | null {
  return brut && /^\d+$/.test(brut) ? brut : null;
}

function parserMontant(brut: string | null): number | null {
  if (!brut) return null;
  const montant = Number(brut.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(montant) && montant >= 0 ? montant : null;
}

export interface EvaluationChorus {
  maj: MajChorus;
  statuts: StatutsChorus;
}

function statut<T>(lu: T | null, actuel: T | null): StatutChorus {
  if (lu === null) return "absent";
  return lu === actuel ? "inchange" : "reporte";
}

// Une valeur vidée dans DN n'efface rien chez nous ; la date n'avance que si la valeur change.
export function evaluerChorus(
  actuel: ColonnesChorus,
  annotations: AnnotationLue[],
  demarcheNumber: number,
  maintenant: Date
): EvaluationChorus {
  const ids = idsAnnotationsChorus(demarcheNumber);
  const tiers = parserNumero(lire(annotations, ids.tiersFournisseur));
  const ej = parserNumero(lire(annotations, ids.numeroEj));
  const montant = parserMontant(lire(annotations, ids.montantSubvention));
  const statuts: StatutsChorus = {
    tiersFournisseur: statut(tiers, actuel.chorusTiersFournisseur),
    numeroEj: statut(ej, actuel.chorusNumeroEj),
    montantSubvention: statut(montant, actuel.chorusMontantSubvention),
  };
  const maj: MajChorus = {};

  if (statuts.tiersFournisseur === "reporte") {
    maj.chorusTiersFournisseur = tiers;
    maj.chorusTiersFournisseurAt = maintenant;
  }
  if (statuts.numeroEj === "reporte") {
    maj.chorusNumeroEj = ej;
    maj.chorusNumeroEjAt = maintenant;
  }
  if (statuts.montantSubvention === "reporte") {
    maj.chorusMontantSubvention = montant;
    maj.chorusMontantSubventionAt = maintenant;
  }
  return { maj, statuts };
}

export function calculerMajChorus(
  actuel: ColonnesChorus,
  annotations: AnnotationLue[],
  demarcheNumber: number,
  maintenant: Date
): MajChorus {
  return evaluerChorus(actuel, annotations, demarcheNumber, maintenant).maj;
}
