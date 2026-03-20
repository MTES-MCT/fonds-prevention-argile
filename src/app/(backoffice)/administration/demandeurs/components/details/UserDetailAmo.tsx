"use client";

import { UserWithParcoursDetails, EmailTrackingStatus } from "@/features/backoffice";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { formatDateTime } from "@/shared/utils/date.utils";

interface UserDetailAmoProps {
  user: UserWithParcoursDetails;
}

/**
 * Détermine le statut du tracking email
 */
function getEmailTrackingStatus(
  emailTracking: NonNullable<UserWithParcoursDetails["amoValidation"]>["emailTracking"]
): EmailTrackingStatus {
  if (emailTracking.bounceType === "hard") return "bounce_hard";
  if (emailTracking.bounceType === "soft") return "bounce_soft";
  if (emailTracking.clickedAt) return "clique";
  if (emailTracking.openedAt) return "ouvert";
  if (emailTracking.deliveredAt) return "delivre";
  if (emailTracking.sentAt) return "envoye";
  return "non_envoye";
}

/**
 * Labels des statuts email
 */
const EMAIL_STATUS_LABELS: Record<EmailTrackingStatus, string> = {
  non_envoye: "Non envoyé",
  envoye: "Envoyé",
  delivre: "Délivré",
  ouvert: "Ouvert",
  clique: "Cliqué",
  bounce_soft: "Erreur temporaire",
  bounce_hard: "Erreur permanente",
};

/**
 * Génère l'URL de validation AMO
 */
function getValidationUrl(token: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/amo/validation/${token}`;
}

/**
 * Vérifie si le token est encore valide
 */
function isTokenValid(token: { expiresAt: Date; usedAt: Date | null }): boolean {
  return !token.usedAt && token.expiresAt > new Date();
}

export function UserDetailAmo({ user }: UserDetailAmoProps) {
  if (!user.amoValidation) {
    return (
      <div className="fr-callout fr-callout--info">
        <p className="fr-callout__text">Aucune AMO sélectionnée</p>
      </div>
    );
  }

  const emailStatus = getEmailTrackingStatus(user.amoValidation.emailTracking);

  return (
    <div>
      {/* Informations AMO */}
      <div className="fr-mb-4w">
        <h3 className="fr-h6 fr-mb-3w">
          <span className="fr-icon-team-line fr-mr-1w" aria-hidden="true" />
          Informations AMO
        </h3>
        <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
          {/* Nom de l'AMO */}
          <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <div className="fr-col-12 fr-col-md-4">
              <dt className="fr-text--regular fr-mb-0">Nom de l'AMO</dt>
            </div>
            <div className="fr-col-12 fr-col-md-8">
              <dd className="fr-text--bold fr-mb-0">{user.amoValidation.amo.nom}</dd>
            </div>
          </div>

          {/* SIRET */}
          <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <div className="fr-col-12 fr-col-md-4">
              <dt className="fr-text--regular fr-mb-0">SIRET</dt>
            </div>
            <div className="fr-col-12 fr-col-md-8">
              <dd className="fr-text--bold fr-mb-0">{user.amoValidation.amo.siret || "—"}</dd>
            </div>
          </div>

          {/* Email(s) */}
          <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <div className="fr-col-12 fr-col-md-4">
              <dt className="fr-text--regular fr-mb-0">Email(s)</dt>
            </div>
            <div className="fr-col-12 fr-col-md-8">
              <dd className="fr-text--bold fr-mb-0">{user.amoValidation.amo.emails}</dd>
            </div>
          </div>

          {/* Téléphone */}
          <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <div className="fr-col-12 fr-col-md-4">
              <dt className="fr-text--regular fr-mb-0">Téléphone</dt>
            </div>
            <div className="fr-col-12 fr-col-md-8">
              <dd className="fr-text--bold fr-mb-0">{user.amoValidation.amo.telephone || "—"}</dd>
            </div>
          </div>

          {/* Adresse */}
          <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <div className="fr-col-12 fr-col-md-4">
              <dt className="fr-text--regular fr-mb-0">Adresse</dt>
            </div>
            <div className="fr-col-12 fr-col-md-8">
              <dd className="fr-text--bold fr-mb-0">{user.amoValidation.amo.adresse || "—"}</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Statut validation */}
      <div className="fr-mb-4w">
        <h3 className="fr-h6 fr-mb-3w">
          <span className="fr-icon-checkbox-circle-line fr-mr-1w" aria-hidden="true" />
          Statut de validation
        </h3>
        <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
          {/* Statut */}
          <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <div className="fr-col-12 fr-col-md-4">
              <dt className="fr-text--regular fr-mb-0">Statut</dt>
            </div>
            <div className="fr-col-12 fr-col-md-8">
              <dd className="fr-mb-0">
                <span
                  className={`fr-badge ${
                    user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE
                      ? "fr-badge--success"
                      : user.amoValidation.statut === StatutValidationAmo.EN_ATTENTE
                        ? "fr-badge--green-archipel"
                        : "fr-badge--error"
                  }`}>
                  {user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE
                    ? "Validé"
                    : user.amoValidation.statut === StatutValidationAmo.EN_ATTENTE
                      ? "En attente"
                      : user.amoValidation.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE
                        ? "Non éligible"
                        : "Refusé"}
                </span>
              </dd>
            </div>
          </div>

          {/* Date de demande */}
          <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
            <div className="fr-col-12 fr-col-md-4">
              <dt className="fr-text--regular fr-mb-0">Date de demande</dt>
            </div>
            <div className="fr-col-12 fr-col-md-8">
              <dd className="fr-text--bold fr-mb-0">{formatDateTime(user.amoValidation.choisieAt.toISOString())}</dd>
            </div>
          </div>

          {/* Date de validation/refus */}
          {user.amoValidation.valideeAt && (
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Date de validation/refus</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{formatDateTime(user.amoValidation.valideeAt.toISOString())}</dd>
              </div>
            </div>
          )}

          {/* Commentaire */}
          {user.amoValidation.commentaire && (
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Commentaire</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">{user.amoValidation.commentaire}</dd>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tracking email */}
      {emailStatus && (
        <div className="fr-mb-4w">
          <h3 className="fr-h6 fr-mb-3w">
            <span className="fr-icon-mail-line fr-mr-1w" aria-hidden="true" />
            Statut de l'email de validation
          </h3>
          <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
            {/* Statut */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Statut</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-mb-0">
                  <span
                    className={`fr-badge ${
                      emailStatus === "clique" || emailStatus === "ouvert"
                        ? "fr-badge--success"
                        : emailStatus === "delivre" || emailStatus === "envoye"
                          ? "fr-badge--info"
                          : emailStatus === "bounce_hard" || emailStatus === "bounce_soft"
                            ? "fr-badge--error"
                            : "fr-badge--new"
                    }`}>
                    {EMAIL_STATUS_LABELS[emailStatus]}
                  </span>
                </dd>
              </div>
            </div>

            {/* Envoyé le */}
            {user.amoValidation.emailTracking.sentAt && (
              <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
                <div className="fr-col-12 fr-col-md-4">
                  <dt className="fr-text--regular fr-mb-0">Envoyé le</dt>
                </div>
                <div className="fr-col-12 fr-col-md-8">
                  <dd className="fr-text--bold fr-mb-0">
                    {formatDateTime(user.amoValidation.emailTracking.sentAt.toISOString())}
                  </dd>
                </div>
              </div>
            )}

            {/* Ouvert le */}
            {user.amoValidation.emailTracking.openedAt && (
              <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
                <div className="fr-col-12 fr-col-md-4">
                  <dt className="fr-text--regular fr-mb-0">Ouvert le</dt>
                </div>
                <div className="fr-col-12 fr-col-md-8">
                  <dd className="fr-text--bold fr-mb-0">
                    {formatDateTime(user.amoValidation.emailTracking.openedAt.toISOString())}
                  </dd>
                </div>
              </div>
            )}

            {/* Cliqué le */}
            {user.amoValidation.emailTracking.clickedAt && (
              <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
                <div className="fr-col-12 fr-col-md-4">
                  <dt className="fr-text--regular fr-mb-0">Cliqué le</dt>
                </div>
                <div className="fr-col-12 fr-col-md-8">
                  <dd className="fr-text--bold fr-mb-0">
                    {formatDateTime(user.amoValidation.emailTracking.clickedAt.toISOString())}
                  </dd>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lien de validation */}
      {user.amoValidation.token && (
        <div className="fr-mb-4w">
          <h3 className="fr-h6 fr-mb-3w">
            <span className="fr-icon-links-line fr-mr-1w" aria-hidden="true" />
            Lien de validation
          </h3>
          <div style={{ borderTop: "1px solid var(--border-default-grey)" }}>
            {/* Statut du token */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Statut du token</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-mb-0">
                  <span
                    className={`fr-badge ${
                      isTokenValid(user.amoValidation.token) ? "fr-badge--success" : "fr-badge--error"
                    }`}>
                    {isTokenValid(user.amoValidation.token) ? "Valide" : "Expiré/Utilisé"}
                  </span>
                </dd>
              </div>
            </div>

            {/* Lien de validation */}
            {isTokenValid(user.amoValidation.token) && (
              <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
                <div className="fr-col-12 fr-col-md-4">
                  <dt className="fr-text--regular fr-mb-0">Lien</dt>
                </div>
                <div className="fr-col-12 fr-col-md-8">
                  <dd className="fr-mb-0">
                    <a
                      href={getValidationUrl(user.amoValidation.token.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fr-link fr-icon-external-link-line fr-link--icon-right">
                      Ouvrir le lien de validation
                    </a>
                  </dd>
                </div>
              </div>
            )}

            {/* Créé le */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Créé le</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">
                  {formatDateTime(user.amoValidation.token.createdAt.toISOString())}
                </dd>
              </div>
            </div>

            {/* Expire le */}
            <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
              <div className="fr-col-12 fr-col-md-4">
                <dt className="fr-text--regular fr-mb-0">Expire le</dt>
              </div>
              <div className="fr-col-12 fr-col-md-8">
                <dd className="fr-text--bold fr-mb-0">
                  {formatDateTime(user.amoValidation.token.expiresAt.toISOString())}
                </dd>
              </div>
            </div>

            {/* Utilisé le */}
            {user.amoValidation.token.usedAt && (
              <div className="fr-grid-row fr-py-2w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
                <div className="fr-col-12 fr-col-md-4">
                  <dt className="fr-text--regular fr-mb-0">Utilisé le</dt>
                </div>
                <div className="fr-col-12 fr-col-md-8">
                  <dd className="fr-text--bold fr-mb-0">
                    {formatDateTime(user.amoValidation.token.usedAt.toISOString())}
                  </dd>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
