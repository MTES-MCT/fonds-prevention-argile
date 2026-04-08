import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { DS_STATUS_LABELS } from "@/features/parcours/dossiers-ds/domain/value-objects/ds-status";

interface DossierStatusBadgeProps {
  dsStatus: DSStatus | null;
}

const DS_STATUS_BADGE_CLASS: Record<DSStatus, string> = {
  [DSStatus.EN_CONSTRUCTION]: "fr-badge--new",
  [DSStatus.EN_INSTRUCTION]: "fr-badge--info",
  [DSStatus.ACCEPTE]: "fr-badge--success",
  [DSStatus.REFUSE]: "fr-badge--error",
  [DSStatus.CLASSE_SANS_SUITE]: "fr-badge--error",
  [DSStatus.NON_ACCESSIBLE]: "fr-badge--warning",
};

/**
 * Badge affichant le statut DS du dossier avec la variante DSFR correspondante
 */
export function DossierStatusBadge({ dsStatus }: DossierStatusBadgeProps) {
  if (!dsStatus) {
    return <p className="fr-badge fr-badge--new">EN CONSTRUCTION</p>;
  }

  const badgeClass = DS_STATUS_BADGE_CLASS[dsStatus] ?? "fr-badge--new";
  const label = DS_STATUS_LABELS[dsStatus] ?? dsStatus;

  return <p className={`fr-badge ${badgeClass}`}>{label.toUpperCase()}</p>;
}
