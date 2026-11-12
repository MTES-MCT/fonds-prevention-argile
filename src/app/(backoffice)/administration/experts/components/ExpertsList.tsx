"use client";

import type { ExpertAnnuaire, ExpertGestion } from "@/features/backoffice";
import DepartementsExpert from "./DepartementsExpert";

interface ExpertsListProps {
  experts: (ExpertGestion | ExpertAnnuaire)[];
  gestion: boolean;
  onModifier?: (expert: ExpertGestion) => void;
  onDesactiver?: (expert: ExpertGestion) => void;
  onReactiver?: (expert: ExpertGestion) => void;
  modalFormulaireId?: string;
  modalDesactiverId?: string;
  isLoading?: boolean;
}

function formaterDate(iso: string | null): string {
  if (!iso) return "Non renseignée";
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

function estGestion(expert: ExpertGestion | ExpertAnnuaire): expert is ExpertGestion {
  return "contactInterne" in expert;
}

export default function ExpertsList({
  experts,
  gestion,
  onModifier,
  onDesactiver,
  onReactiver,
  modalFormulaireId,
  modalDesactiverId,
  isLoading = false,
}: ExpertsListProps) {
  if (experts.length === 0) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Aucun expert pour ces critères.</p>
      </div>
    );
  }

  return (
    <div className="fr-table fr-table--no-caption">
      <table>
        <caption>Experts</caption>
        <thead>
          <tr>
            <th scope="col">Expert</th>
            <th scope="col">Départements et contact de réservation</th>
            <th scope="col">Validation DHUP</th>
            {gestion && <th scope="col">Contact interne</th>}
            {gestion && <th scope="col">Statut</th>}
            {gestion && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {experts.map((expert) => {
            const detail = estGestion(expert) ? expert : null;
            return (
              <tr key={expert.id}>
                <td>
                  <span className="font-medium block">{expert.nom}</span>
                  <span className="text-sm text-(--text-mention-grey)">SIRET {expert.siret}</span>
                </td>
                <td>
                  <DepartementsExpert departements={expert.departements} />
                </td>
                <td className="text-sm">{formaterDate(expert.dateValidationDhup)}</td>
                {detail && (
                  <td className="text-sm">
                    {[detail.contactInterne.nom, detail.contactInterne.email, detail.contactInterne.telephone]
                      .filter(Boolean)
                      .join(" · ") || <span className="text-(--text-mention-grey)">Non renseigné</span>}
                  </td>
                )}
                {detail && (
                  <td className="text-sm">
                    {detail.desactivation ? (
                      <>
                        <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--warning">Désactivé</span>
                        <span className="block text-(--text-mention-grey) fr-mt-1v">
                          Le {formaterDate(detail.desactivation.le)}
                          {detail.desactivation.par ? ` par ${detail.desactivation.par}` : ""}
                          {detail.desactivation.raison ? ` : ${detail.desactivation.raison}` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--success">Actif</span>
                    )}
                  </td>
                )}
                {detail && (
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left fr-icon-edit-line"
                        aria-controls={modalFormulaireId}
                        data-fr-opened="false"
                        onClick={() => onModifier?.(detail)}
                        disabled={isLoading}>
                        Modifier
                      </button>
                      {detail.desactivation ? (
                        <button
                          type="button"
                          className="fr-btn fr-btn--sm fr-btn--tertiary"
                          onClick={() => onReactiver?.(detail)}
                          disabled={isLoading}>
                          Réactiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="fr-btn fr-btn--sm fr-btn--tertiary"
                          aria-controls={modalDesactiverId}
                          data-fr-opened="false"
                          onClick={() => onDesactiver?.(detail)}
                          disabled={isLoading}>
                          Désactiver
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
