import { formatDate } from "@/shared/utils";
import { DSStatus } from "../domain/value-objects/ds-status";
import { isDSAccepted, isDSRejected } from "../domain/value-objects/ds-status";

/**
 * Sous-ensemble des champs d'un dossier DS nécessaires à la timeline.
 * Volontairement structurel (pas `DossierDS`) pour accepter aussi bien l'entité
 * demandeur (`DossierDS`) que le DTO agent (`DossierInfo`), qui exposent les mêmes dates.
 */
export interface DossierTimelineData {
  etatDs: DSStatus | null;
  createdAt: Date | null;
  submittedAt: Date | null;
  instructedAt: Date | null;
  processedAt: Date | null;
}

interface Jalon {
  label: string;
  date: Date;
  iconClass: string;
}

/** Libellé + icône du jalon de décision selon l'état final du dossier. */
function decisionJalon(etat: DSStatus | null, processedAt: Date): Jalon {
  if (etat && isDSAccepted(etat)) {
    return { label: "Validé", date: processedAt, iconClass: "fr-icon-success-fill text-green-600" };
  }
  if (etat && isDSRejected(etat)) {
    return { label: "Refusé", date: processedAt, iconClass: "fr-icon-close-circle-fill text-red-600" };
  }
  return { label: "Traité", date: processedAt, iconClass: "fr-icon-checkbox-circle-fill" };
}

/**
 * Timeline compacte des dates clés d'un dossier Démarches Simplifiées.
 * N'affiche que les jalons franchis (date présente) : brouillon créé, déposé,
 * passé en instruction, décision (validé / refusé). Réutilisable côté demandeur et agent.
 */
export function DossierTimeline({ dossier, title }: { dossier: DossierTimelineData; title?: string }) {
  const jalons: Jalon[] = [];

  if (dossier.createdAt) {
    jalons.push({ label: "Brouillon créé", date: dossier.createdAt, iconClass: "fr-icon-draft-line" });
  }
  if (dossier.submittedAt) {
    jalons.push({ label: "Déposé", date: dossier.submittedAt, iconClass: "fr-icon-send-plane-fill" });
  }
  if (dossier.instructedAt) {
    jalons.push({ label: "En instruction", date: dossier.instructedAt, iconClass: "fr-icon-search-line" });
  }
  if (dossier.processedAt) {
    jalons.push(decisionJalon(dossier.etatDs, dossier.processedAt));
  }

  if (jalons.length === 0) return null;

  return (
    <div className="fr-text--sm">
      {title && <p className="fr-text--bold fr-mb-1v">{title}</p>}
      <ul className="fr-raw-list">
        {jalons.map((jalon, index) => (
          <li key={index} className="fr-mb-1v">
            <span className={`${jalon.iconClass} fr-icon--sm fr-mr-1v`} aria-hidden="true" />
            {jalon.label} le {formatDate(jalon.date.toISOString())}
          </li>
        ))}
      </ul>
    </div>
  );
}
