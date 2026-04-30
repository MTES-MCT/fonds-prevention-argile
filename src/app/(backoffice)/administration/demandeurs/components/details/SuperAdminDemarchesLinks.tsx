"use client";

import type { DossierInfo, UserWithParcoursDetails } from "@/features/backoffice";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { DS_STATUS_LABELS } from "@/features/parcours/dossiers-ds/domain/value-objects/ds-status";
import {
  getDossierDsDemandeUrl,
  getDossierDsInstructeurUrl,
  getDossierDsMessagerieUrl,
} from "@/features/parcours/dossiers-ds/utils/ds-url.utils";

interface SuperAdminDemarchesLinksProps {
  dossiers: UserWithParcoursDetails["dossiers"];
}

const STEP_ROWS: { key: keyof UserWithParcoursDetails["dossiers"]; label: string }[] = [
  { key: "eligibilite", label: "Éligibilité" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "devis", label: "Devis" },
  { key: "factures", label: "Factures" },
];

/**
 * Zone réservée au super administrateur : liens directs vers les démarches DS
 * (vue demandeur, vue instructeur, messagerie) pour chaque étape du parcours.
 *
 * Le rendu de ce composant doit être conditionné au rôle super admin côté parent.
 */
export function SuperAdminDemarchesLinks({ dossiers }: SuperAdminDemarchesLinksProps) {
  const rows = STEP_ROWS.filter(({ key }) => dossiers[key] !== null) as {
    key: keyof UserWithParcoursDetails["dossiers"];
    label: string;
  }[];

  if (rows.length === 0) {
    return (
      <section className="fr-callout fr-mt-4w">
        <h4 className="fr-callout__title fr-h6">Démarches DS — DN</h4>
        <p className="fr-callout__text">
          Aucune démarche Démarches Simplifiées n&apos;a encore été créée pour ce parcours.
        </p>
      </section>
    );
  }

  return (
    <section className="fr-callout fr-mt-4w">
      <h4 className="fr-callout__title fr-h6">Démarches DS — DN</h4>
      <p className="fr-callout__text">Accès direct aux dossiers sur Démarches Simplifiées pour consultation.</p>

      <ul className="fr-mt-2w" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map(({ key, label }) => {
          const d = dossiers[key] as DossierInfo;
          const statusLabel = DS_STATUS_LABELS[d.dsStatus as DSStatus] ?? d.dsStatus;
          const dsNumber = d.dsNumber;

          return (
            <li
              key={d.id}
              className="fr-mb-2w"
              style={{ borderLeft: "3px solid var(--border-action-high-blue-france)", paddingLeft: "1rem" }}>
              <p className="fr-mb-1v">
                <strong>{label}</strong>
                {dsNumber ? (
                  <>
                    {" "}
                    — N° <code>{dsNumber}</code>
                  </>
                ) : (
                  <>
                    {" "}
                    — <em>pas encore de numéro DS</em>
                  </>
                )}
                {" — "}
                <span className="fr-text--sm">{statusLabel}</span>
              </p>
              {dsNumber ? (
                <ul
                  className="fr-mb-0"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem 1.5rem",
                  }}>
                  <li>
                    <a
                      className="fr-link fr-link--icon-right fr-icon-external-link-line fr-text--sm"
                      href={getDossierDsDemandeUrl(Number(dsNumber))}
                      target="_blank"
                      rel="noopener noreferrer">
                      Vue demandeur
                    </a>
                  </li>
                  <li>
                    <a
                      className="fr-link fr-link--icon-right fr-icon-external-link-line fr-text--sm"
                      href={getDossierDsInstructeurUrl(d.dsDemarcheId, dsNumber)}
                      target="_blank"
                      rel="noopener noreferrer">
                      Vue instructeur
                    </a>
                  </li>
                  <li>
                    <a
                      className="fr-link fr-link--icon-right fr-icon-external-link-line fr-text--sm"
                      href={getDossierDsMessagerieUrl(Number(dsNumber))}
                      target="_blank"
                      rel="noopener noreferrer">
                      Messagerie
                    </a>
                  </li>
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
