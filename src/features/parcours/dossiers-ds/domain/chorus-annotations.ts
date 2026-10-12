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

// Une valeur vidée dans DN n'efface rien chez nous ; la date n'avance que si la valeur change.
export function calculerMajChorus(
  actuel: ColonnesChorus,
  annotations: AnnotationLue[],
  demarcheNumber: number,
  maintenant: Date
): MajChorus {
  const ids = idsAnnotationsChorus(demarcheNumber);
  const tiers = parserNumero(lire(annotations, ids.tiersFournisseur));
  const ej = parserNumero(lire(annotations, ids.numeroEj));
  const montant = parserMontant(lire(annotations, ids.montantSubvention));
  const maj: MajChorus = {};

  if (tiers !== null && tiers !== actuel.chorusTiersFournisseur) {
    maj.chorusTiersFournisseur = tiers;
    maj.chorusTiersFournisseurAt = maintenant;
  }
  if (ej !== null && ej !== actuel.chorusNumeroEj) {
    maj.chorusNumeroEj = ej;
    maj.chorusNumeroEjAt = maintenant;
  }
  if (montant !== null && montant !== actuel.chorusMontantSubvention) {
    maj.chorusMontantSubvention = montant;
    maj.chorusMontantSubventionAt = maintenant;
  }
  return maj;
}
