import { formatDate } from "@/shared/utils";
import { formatMontantEuros, type SuiviChorus, type ValeurChorus } from "../domain/value-objects/suivi-chorus";

interface SuiviChorusAgentProps {
  etapeLabel: string;
  suivi: SuiviChorus;
  instructedAt: Date | null;
  notifiedAt: Date | null;
}

function Ligne<T>({ label, item, format }: { label: string; item: ValeurChorus<T> | null; format: (v: T) => string }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {item ? (
          <>
            {format(item.valeur)}
            <div className="fr-text--xs fr-text-mention--grey fr-mb-0">
              Renseigné le {formatDate(item.renseigneAt.toISOString())}
            </div>
          </>
        ) : (
          <span style={{ color: "var(--text-mention-grey)" }}>Pas encore renseigné</span>
        )}
      </td>
    </tr>
  );
}

export function SuiviChorusAgent({ etapeLabel, suivi, instructedAt, notifiedAt }: SuiviChorusAgentProps) {
  return (
    <section className="fr-p-3w" style={{ border: "1px solid var(--border-default-grey)" }}>
      <h3 className="fr-h6 fr-mb-1v">Suivi Chorus</h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">
        {etapeLabel} · informations saisies par la DDT dans Démarches Numériques
      </p>
      <div className="fr-table fr-table--no-caption fr-mb-0">
        <div className="fr-table__wrapper">
          <div className="fr-table__container">
            <div className="fr-table__content">
              <table>
                <caption>Suivi Chorus du dossier</caption>
                <tbody>
                  <tr>
                    <th scope="row">Mise en instruction</th>
                    <td>{instructedAt ? formatDate(instructedAt.toISOString()) : "—"}</td>
                  </tr>
                  <Ligne label="Tiers fournisseur" item={suivi.tiersFournisseur} format={(v) => v} />
                  <Ligne label="Numéro d'EJ" item={suivi.numeroEj} format={(v) => v} />
                  <Ligne label="Montant de la subvention" item={suivi.montantSubvention} format={formatMontantEuros} />
                  <tr>
                    <th scope="row">Notification</th>
                    <td>{notifiedAt ? formatDate(notifiedAt.toISOString()) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
