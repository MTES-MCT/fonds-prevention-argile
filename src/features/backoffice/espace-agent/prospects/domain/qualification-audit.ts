import {
  ACTION_TYPE_AV_QUALIFICATION_ELIGIBLE,
  ACTION_TYPE_AV_QUALIFICATION_A_QUALIFIER,
  ACTION_TYPE_AV_QUALIFICATION_NON_ELIGIBLE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { QualificationDecision, RAISONS_INELIGIBILITE } from "./types";

/** Type d'action système tracé pour chaque décision de qualification Aller-vers. */
export const ACTION_TYPE_BY_DECISION: Record<QualificationDecision, string> = {
  [QualificationDecision.ELIGIBLE]: ACTION_TYPE_AV_QUALIFICATION_ELIGIBLE,
  [QualificationDecision.A_QUALIFIER]: ACTION_TYPE_AV_QUALIFICATION_A_QUALIFIER,
  [QualificationDecision.NON_ELIGIBLE]: ACTION_TYPE_AV_QUALIFICATION_NON_ELIGIBLE,
};

const LABEL_BY_RAISON: Record<string, string> = Object.fromEntries(
  RAISONS_INELIGIBILITE.map((r) => [r.value, r.label])
);

/** Résout les raisons stockées en libellés lisibles (le tag « autre » porte sa précision après `:`). */
function formatRaisons(raisons: string[]): string {
  return raisons
    .map((raison) => {
      const [value, ...reste] = raison.split(":");
      const label = LABEL_BY_RAISON[value] ?? value;
      const precision = reste.join(":").trim();
      return precision ? `${label} : ${precision}` : label;
    })
    .join(", ");
}

interface QualificationAuditParams {
  decision: QualificationDecision;
  raisonsIneligibilite?: string[] | null;
  estMandataireFinancier?: boolean | null;
  note?: string | null;
}

/**
 * Compose le message de l'action d'audit d'une qualification : raisons du refus ou
 * engagement de mandataire selon la décision, puis la note libre de l'agent.
 */
export function buildQualificationAuditMessage({
  decision,
  raisonsIneligibilite,
  estMandataireFinancier,
  note,
}: QualificationAuditParams): string | null {
  const parts: string[] = [];

  if (decision === QualificationDecision.NON_ELIGIBLE && raisonsIneligibilite?.length) {
    parts.push(`Raisons : ${formatRaisons(raisonsIneligibilite)}`);
  }

  if (decision === QualificationDecision.ELIGIBLE && typeof estMandataireFinancier === "boolean") {
    parts.push(`Mandataire financier : ${estMandataireFinancier ? "oui" : "non"}`);
  }

  const noteClean = note?.trim();
  if (noteClean) parts.push(noteClean);

  return parts.length > 0 ? parts.join(" — ") : null;
}
