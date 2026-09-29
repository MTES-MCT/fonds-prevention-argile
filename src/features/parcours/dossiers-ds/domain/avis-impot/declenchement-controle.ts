import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

export interface EtatDeclenchementControle {
  step: Step;
  dsStatus: DSStatus | null;
  /** Dernier contrôle enregistré en base, null s'il n'a jamais eu lieu. */
  controleAt: Date | null;
  champsModifiesAtControle: Date | null;
  /** `dateDerniereModificationChamps` renvoyée par DN à la synchronisation. */
  champsModifiesAtDn: string | null | undefined;
}

// Après la décision, le dossier appartient à la DDT : l'annotation reste en l'état.
const ETATS_CONTROLABLES: ReadonlySet<DSStatus> = new Set([DSStatus.EN_CONSTRUCTION, DSStatus.EN_INSTRUCTION]);

export function doitControlerAvisImpot(etat: EtatDeclenchementControle): boolean {
  if (etat.step !== Step.ELIGIBILITE || !etat.dsStatus || !ETATS_CONTROLABLES.has(etat.dsStatus)) return false;
  if (!etat.controleAt || !etat.champsModifiesAtControle) return true;
  if (!etat.champsModifiesAtDn) return false;
  return new Date(etat.champsModifiesAtDn).getTime() !== etat.champsModifiesAtControle.getTime();
}
