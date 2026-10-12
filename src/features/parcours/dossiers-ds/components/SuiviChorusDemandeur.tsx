import { formatDate } from "@/shared/utils";
import { formatMontantEuros, type SuiviChorus } from "../domain/value-objects/suivi-chorus";

interface SuiviChorusDemandeurProps {
  dsNumber: string | null;
  suivi: SuiviChorus | null;
  notifiedAt: Date | null;
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="fr-grid-row fr-grid-row--gutters fr-py-1v"
      style={{ borderTop: "1px solid var(--border-default-grey)" }}>
      <dt className="fr-col-12 fr-col-sm-6 fr-text--sm fr-text-mention--grey fr-mb-0">{label}</dt>
      <dd className="fr-col-12 fr-col-sm-6 fr-text--sm fr-mb-0 fr-ml-0">{children}</dd>
    </div>
  );
}

// Montant et EJ ne sont montrés qu'une fois la subvention notifiée : la DDT peut encore les corriger avant.
export function SuiviChorusDemandeur({ dsNumber, suivi, notifiedAt }: SuiviChorusDemandeurProps) {
  const afficherSubvention = notifiedAt !== null && suivi !== null;

  return (
    <dl className="fr-mt-2w fr-mb-0">
      {dsNumber && <Ligne label="Dossier Démarches Numériques">n° {dsNumber}</Ligne>}
      {afficherSubvention && suivi.montantSubvention && (
        <Ligne label="Montant de la subvention">
          <strong>{formatMontantEuros(suivi.montantSubvention.valeur)}</strong>
        </Ligne>
      )}
      {afficherSubvention && suivi.numeroEj && <Ligne label="Engagement juridique (EJ)">{suivi.numeroEj.valeur}</Ligne>}
      {afficherSubvention && <Ligne label="Subvention notifiée le">{formatDate(notifiedAt.toISOString())}</Ligne>}
    </dl>
  );
}
