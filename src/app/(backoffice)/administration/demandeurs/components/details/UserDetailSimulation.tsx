"use client";

import { UserWithParcoursDetails } from "@/features/backoffice";

interface UserDetailSimulationProps {
  user: UserWithParcoursDetails;
}

/**
 * Formatte un nombre en euros
 */
function formatEuros(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function UserDetailSimulation({ user }: UserDetailSimulationProps) {
  if (!user.rgaSimulation) {
    return (
      <div className="fr-callout fr-callout--info">
        <p className="fr-callout__text">Aucune simulation RGA complétée</p>
      </div>
    );
  }

  return (
    <div>
      {/* Section Logement */}
      {user.rgaSimulation.logement && (
        <div className="fr-mb-4w">
          <h3 className="fr-h6 fr-mb-3w">
            <span className="fr-icon-home-4-line fr-mr-1w" aria-hidden="true" />
            Logement
          </h3>
          <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
            {/* Adresse */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Adresse</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.logement.adresse || "—"}</dd>
              </div>
            </div>

            {/* Commune */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Commune</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.logement.commune_nom || "—"}</dd>
              </div>
            </div>

            {/* Département */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Département</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.logement.code_departement || "—"}</dd>
              </div>
            </div>

            {/* Type de logement */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Type de logement</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.logement.type || "—"}</dd>
              </div>
            </div>

            {/* Zone d'exposition */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Zone d'exposition</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-mb-0">
                  <span
                    className={`fr-badge fr-badge--sm ${
                      user.rgaSimulation.logement.zone_dexposition === "fort"
                        ? "fr-badge--error"
                        : user.rgaSimulation.logement.zone_dexposition === "moyen"
                          ? "fr-badge--warning"
                          : "fr-badge--success"
                    }`}>
                    {user.rgaSimulation.logement.zone_dexposition || "—"}
                  </span>
                </dd>
              </div>
            </div>

            {/* Année de construction */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Année de construction</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.logement.annee_de_construction || "—"}</dd>
              </div>
            </div>

            {/* Nombre de niveaux */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Nombre de niveaux</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.logement.niveaux || "—"}</dd>
              </div>
            </div>

            {/* Mitoyen */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Mitoyen</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.logement.mitoyen ? "Oui" : "Non"}</dd>
              </div>
            </div>

            {/* Propriétaire occupant */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Propriétaire occupant</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">
                  {user.rgaSimulation.logement.proprietaire_occupant ? "Oui" : "Non"}
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section RGA */}
      {user.rgaSimulation.rga && (
        <div className="fr-mb-4w">
          <h3 className="fr-h6 fr-mb-3w">
            <span className="fr-icon-error-warning-line fr-mr-1w" aria-hidden="true" />
            État du logement (RGA)
          </h3>
          <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
            {/* État des sinistres */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">État des sinistres</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-mb-0">
                  <span
                    className={`fr-badge fr-badge--sm ${
                      user.rgaSimulation.rga.sinistres === "saine"
                        ? "fr-badge--success"
                        : user.rgaSimulation.rga.sinistres === "très peu endommagée"
                          ? "fr-badge--warning"
                          : "fr-badge--error"
                    }`}>
                    {user.rgaSimulation.rga.sinistres || "—"}
                  </span>
                </dd>
              </div>
            </div>

            {/* Assuré RGA */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Assuré RGA</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.rga.assure ? "Oui" : "Non"}</dd>
              </div>
            </div>

            {/* Déjà indemnisé */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Déjà indemnisé</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">
                  {user.rgaSimulation.rga.indemnise_indemnise_rga ? "Oui" : "Non"}
                </dd>
              </div>
            </div>

            {/* Montant indemnité */}
            {user.rgaSimulation.rga.indemnise_montant_indemnite &&
              user.rgaSimulation.rga.indemnise_montant_indemnite > 0 && (
                <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
                  <div className="fr-col-12 fr-col-md-4">
                    <dt className="fr-text--regular fr-mb-0">Montant indemnité</dt>
                  </div>
                  <div className="fr-col-12 fr-col-md-8">
                    <dd className="fr-text--bold fr-mb-0">
                      {formatEuros(user.rgaSimulation.rga.indemnise_montant_indemnite)}
                    </dd>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Section Ménage */}
      {user.rgaSimulation.menage && (
        <div className="fr-mb-4w">
          <h3 className="fr-h6 fr-mb-3w">
            <span className="fr-icon-parent-line fr-mr-1w" aria-hidden="true" />
            Ménage
          </h3>
          <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
            {/* Nombre de personnes */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Nombre de personnes</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.rgaSimulation.menage.personnes || "—"}</dd>
              </div>
            </div>

            {/* Revenu fiscal de référence */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Revenu fiscal de référence</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">
                  {user.rgaSimulation.menage.revenu_rga ? formatEuros(user.rgaSimulation.menage.revenu_rga) : "—"}
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Taxe foncière */}
      {user.rgaSimulation.taxeFonciere && (
        <div className="fr-mb-4w">
          <h3 className="fr-h6 fr-mb-3w">
            <span className="fr-icon-file-line fr-mr-1w" aria-hidden="true" />
            Taxe foncière
          </h3>
          <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
            {/* Commune éligible */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Commune éligible</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">
                  {user.rgaSimulation.taxeFonciere.commune_eligible ? "Oui" : "Non"}
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
