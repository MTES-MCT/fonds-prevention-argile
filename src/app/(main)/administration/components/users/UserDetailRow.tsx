"use client";

import { useState } from "react";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { formatDateTime } from "@/shared/utils/date.utils";
import { UserWithParcoursDetails } from "@/features/parcours/core";
import { UserTimeline } from "./UserTimeline";

interface UserDetailRowProps {
  user: UserWithParcoursDetails;
}

/**
 * Labels français des statuts AMO
 */
const STATUT_AMO_LABELS: Record<StatutValidationAmo, string> = {
  [StatutValidationAmo.EN_ATTENTE]: "En attente de validation",
  [StatutValidationAmo.LOGEMENT_ELIGIBLE]: "Accompagnement validé",
  [StatutValidationAmo.LOGEMENT_NON_ELIGIBLE]: "Logement non éligible",
  [StatutValidationAmo.ACCOMPAGNEMENT_REFUSE]: "Accompagnement refusé",
};

/**
 * Ligne dépliable avec tous les détails d'un utilisateur
 */
export function UserDetailRow({ user }: UserDetailRowProps) {
  // État pour gérer l'ouverture/fermeture de chaque accordéon
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());

  const toggleAccordion = (id: string) => {
    const newSet = new Set(openAccordions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenAccordions(newSet);
  };

  const accordionId = (section: string) => `accordion-${user.user.id}-${section}`;

  return (
    <div className="fr-p-4w" style={{ backgroundColor: "#f6f6f6" }}>
      <div className="fr-grid-row fr-grid-row--gutters">
        {/* Timeline à gauche (50%) */}
        <div className="fr-col-6">
          <h3 className="fr-h6 fr-mb-2w">Timeline des événements</h3>
          <UserTimeline user={user} />
        </div>

        {/* Accordéons à droite (50%) */}
        <div className="fr-col-6">
          <div className="fr-accordions-group">
            {/* 1. Informations personnelles */}
            <section className="fr-accordion">
              <h3 className="fr-accordion__title">
                <button
                  className="fr-accordion__btn"
                  aria-expanded={openAccordions.has("info")}
                  aria-controls={accordionId("info")}
                  onClick={() => toggleAccordion("info")}>
                  📋 Informations personnelles
                </button>
              </h3>
              <div
                className="fr-collapse"
                id={accordionId("info")}
                style={{ display: openAccordions.has("info") ? "block" : "none" }}>
                <div className="fr-p-2w">
                  <dl className="fr-grid-row fr-grid-row--gutters">
                    <div className="fr-col-6">
                      <dt className="fr-text--bold">FranceConnect ID</dt>
                      <dd className="fr-text--sm">{user.user.fcId}</dd>
                    </div>
                    <div className="fr-col-6">
                      <dt className="fr-text--bold">Email</dt>
                      <dd className="fr-text--sm">{user.user.email || "—"}</dd>
                    </div>
                    <div className="fr-col-6">
                      <dt className="fr-text--bold">Téléphone</dt>
                      <dd className="fr-text--sm">{user.user.telephone || "—"}</dd>
                    </div>
                    <div className="fr-col-6">
                      <dt className="fr-text--bold">Date d'inscription</dt>
                      <dd className="fr-text--sm">{formatDateTime(user.user.createdAt.toISOString())}</dd>
                    </div>
                    <div className="fr-col-6">
                      <dt className="fr-text--bold">Dernière connexion</dt>
                      <dd className="fr-text--sm">{formatDateTime(user.user.lastLogin.toISOString())}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {/* 2. Simulation RGA */}
            <section className="fr-accordion">
              <h3 className="fr-accordion__title">
                <button
                  className="fr-accordion__btn"
                  aria-expanded={openAccordions.has("rga")}
                  aria-controls={accordionId("rga")}
                  onClick={() => toggleAccordion("rga")}>
                  🏠 Simulation RGA
                </button>
              </h3>
              <div
                className="fr-collapse"
                id={accordionId("rga")}
                style={{ display: openAccordions.has("rga") ? "block" : "none" }}>
                <div className="fr-p-2w">
                  {user.rgaSimulation?.logement ? (
                    <dl className="fr-grid-row fr-grid-row--gutters">
                      <div className="fr-col-12">
                        <dt className="fr-text--bold">Adresse</dt>
                        <dd className="fr-text--sm">{user.rgaSimulation.logement.adresse || "—"}</dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Commune</dt>
                        <dd className="fr-text--sm">{user.rgaSimulation.logement.commune || "—"}</dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Code INSEE</dt>
                        <dd className="fr-text--sm">{user.rgaSimulation.logement.codeInsee || "—"}</dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Département</dt>
                        <dd className="fr-text--sm">{user.rgaSimulation.logement.departement || "—"}</dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Type de construction</dt>
                        <dd className="fr-text--sm">{user.rgaSimulation.logement.typeConstruction || "—"}</dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Date de simulation</dt>
                        <dd className="fr-text--sm">
                          {user.parcours?.rgaSimulationCompletedAt
                            ? formatDateTime(user.parcours.rgaSimulationCompletedAt.toISOString())
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="fr-text--sm">Aucune simulation RGA complétée</p>
                  )}
                </div>
              </div>
            </section>

            {/* 3. AMO sélectionnée */}
            <section className="fr-accordion">
              <h3 className="fr-accordion__title">
                <button
                  className="fr-accordion__btn"
                  aria-expanded={openAccordions.has("amo")}
                  aria-controls={accordionId("amo")}
                  onClick={() => toggleAccordion("amo")}>
                  🤝 AMO sélectionnée
                </button>
              </h3>
              <div
                className="fr-collapse"
                id={accordionId("amo")}
                style={{ display: openAccordions.has("amo") ? "block" : "none" }}>
                <div className="fr-p-2w">
                  {user.amoValidation ? (
                    <>
                      <dl className="fr-grid-row fr-grid-row--gutters fr-mb-3w">
                        <div className="fr-col-12">
                          <dt className="fr-text--bold">Statut</dt>
                          <dd>
                            <span
                              className={`fr-badge ${
                                user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE
                                  ? "fr-badge--success"
                                  : user.amoValidation.statut === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE
                                    ? "fr-badge--error"
                                    : "fr-badge--yellow-moutarde"
                              }`}>
                              {STATUT_AMO_LABELS[user.amoValidation.statut]}
                            </span>
                          </dd>
                        </div>
                        <div className="fr-col-12">
                          <dt className="fr-text--bold">Nom de l'AMO</dt>
                          <dd className="fr-text--sm">{user.amoValidation.amo.nom}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">SIRET</dt>
                          <dd className="fr-text--sm">{user.amoValidation.amo.siret || "—"}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Email(s)</dt>
                          <dd className="fr-text--sm">{user.amoValidation.amo.emails}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Téléphone</dt>
                          <dd className="fr-text--sm">{user.amoValidation.amo.telephone || "—"}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Adresse</dt>
                          <dd className="fr-text--sm">{user.amoValidation.amo.adresse || "—"}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Date de demande</dt>
                          <dd className="fr-text--sm">{formatDateTime(user.amoValidation.choisieAt.toISOString())}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Date de validation/refus</dt>
                          <dd className="fr-text--sm">
                            {user.amoValidation.valideeAt
                              ? formatDateTime(user.amoValidation.valideeAt.toISOString())
                              : "—"}
                          </dd>
                        </div>
                        {user.amoValidation.commentaire && (
                          <div className="fr-col-12">
                            <dt className="fr-text--bold">Commentaire</dt>
                            <dd className="fr-text--sm">{user.amoValidation.commentaire}</dd>
                          </div>
                        )}
                      </dl>

                      {/* Données user temporaires */}
                      {(user.amoValidation.userData.prenom ||
                        user.amoValidation.userData.nom ||
                        user.amoValidation.userData.email ||
                        user.amoValidation.userData.telephone ||
                        user.amoValidation.userData.adresseLogement) && (
                        <>
                          <h4 className="fr-h6 fr-mb-2w">Données temporaires (avant validation RGPD)</h4>
                          <dl className="fr-grid-row fr-grid-row--gutters">
                            <div className="fr-col-6">
                              <dt className="fr-text--bold">Prénom</dt>
                              <dd className="fr-text--sm">{user.amoValidation.userData.prenom || "—"}</dd>
                            </div>
                            <div className="fr-col-6">
                              <dt className="fr-text--bold">Nom</dt>
                              <dd className="fr-text--sm">{user.amoValidation.userData.nom || "—"}</dd>
                            </div>
                            <div className="fr-col-6">
                              <dt className="fr-text--bold">Email</dt>
                              <dd className="fr-text--sm">{user.amoValidation.userData.email || "—"}</dd>
                            </div>
                            <div className="fr-col-6">
                              <dt className="fr-text--bold">Téléphone</dt>
                              <dd className="fr-text--sm">{user.amoValidation.userData.telephone || "—"}</dd>
                            </div>
                            <div className="fr-col-12">
                              <dt className="fr-text--bold">Adresse logement</dt>
                              <dd className="fr-text--sm">{user.amoValidation.userData.adresseLogement || "—"}</dd>
                            </div>
                          </dl>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="fr-text--sm">Aucune AMO sélectionnée</p>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Parcours prévention */}
            <section className="fr-accordion">
              <h3 className="fr-accordion__title">
                <button
                  className="fr-accordion__btn"
                  aria-expanded={openAccordions.has("parcours")}
                  aria-controls={accordionId("parcours")}
                  onClick={() => toggleAccordion("parcours")}>
                  📊 Parcours prévention
                </button>
              </h3>
              <div
                className="fr-collapse"
                id={accordionId("parcours")}
                style={{ display: openAccordions.has("parcours") ? "block" : "none" }}>
                <div className="fr-p-2w">
                  {user.parcours ? (
                    <dl className="fr-grid-row fr-grid-row--gutters">
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Étape actuelle</dt>
                        <dd>
                          <span className="fr-badge fr-badge--blue-ecume">{user.parcours.currentStep}</span>
                        </dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Statut actuel</dt>
                        <dd>
                          <span className="fr-badge">{user.parcours.currentStatus}</span>
                        </dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Parcours créé le</dt>
                        <dd className="fr-text--sm">{formatDateTime(user.parcours.createdAt.toISOString())}</dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Dernière mise à jour</dt>
                        <dd className="fr-text--sm">{formatDateTime(user.parcours.updatedAt.toISOString())}</dd>
                      </div>
                      <div className="fr-col-6">
                        <dt className="fr-text--bold">Parcours terminé</dt>
                        <dd className="fr-text--sm">
                          {user.parcours.completedAt ? formatDateTime(user.parcours.completedAt.toISOString()) : "—"}
                        </dd>
                      </div>
                      {user.parcours.rgaDataDeletedAt && (
                        <div className="fr-col-12">
                          <dt className="fr-text--bold">Données RGA supprimées le</dt>
                          <dd className="fr-text--sm">
                            {formatDateTime(user.parcours.rgaDataDeletedAt.toISOString())}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="fr-text--sm">Aucun parcours créé</p>
                  )}
                </div>
              </div>
            </section>

            {/* 5. Dossiers Démarches Simplifiées */}
            <section className="fr-accordion">
              <h3 className="fr-accordion__title">
                <button
                  className="fr-accordion__btn"
                  aria-expanded={openAccordions.has("dossiers")}
                  aria-controls={accordionId("dossiers")}
                  onClick={() => toggleAccordion("dossiers")}>
                  📄 Dossiers Démarches Simplifiées
                </button>
              </h3>
              <div
                className="fr-collapse"
                id={accordionId("dossiers")}
                style={{ display: openAccordions.has("dossiers") ? "block" : "none" }}>
                <div className="fr-p-2w">
                  {/* Éligibilité */}
                  <div className="fr-mb-3w">
                    <h4 className="fr-h6 fr-mb-2w">1. Éligibilité</h4>
                    {user.dossiers.eligibilite ? (
                      <dl className="fr-grid-row fr-grid-row--gutters">
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Numéro DS</dt>
                          <dd className="fr-text--sm">{user.dossiers.eligibilite.dsNumber || "—"}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Statut</dt>
                          <dd>
                            <span className="fr-badge">{user.dossiers.eligibilite.dsStatus}</span>
                          </dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Créé le</dt>
                          <dd className="fr-text--sm">
                            {formatDateTime(user.dossiers.eligibilite.createdAt.toISOString())}
                          </dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Déposé le</dt>
                          <dd className="fr-text--sm">
                            {user.dossiers.eligibilite.submittedAt
                              ? formatDateTime(user.dossiers.eligibilite.submittedAt.toISOString())
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="fr-text--sm">Aucun dossier d'éligibilité</p>
                    )}
                  </div>

                  {/* Diagnostic */}
                  <div className="fr-mb-3w">
                    <h4 className="fr-h6 fr-mb-2w">2. Diagnostic</h4>
                    {user.dossiers.diagnostic ? (
                      <dl className="fr-grid-row fr-grid-row--gutters">
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Numéro DS</dt>
                          <dd className="fr-text--sm">{user.dossiers.diagnostic.dsNumber || "—"}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Statut</dt>
                          <dd>
                            <span className="fr-badge">{user.dossiers.diagnostic.dsStatus}</span>
                          </dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Créé le</dt>
                          <dd className="fr-text--sm">
                            {formatDateTime(user.dossiers.diagnostic.createdAt.toISOString())}
                          </dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Déposé le</dt>
                          <dd className="fr-text--sm">
                            {user.dossiers.diagnostic.submittedAt
                              ? formatDateTime(user.dossiers.diagnostic.submittedAt.toISOString())
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="fr-text--sm">Aucun dossier de diagnostic</p>
                    )}
                  </div>

                  {/* Devis */}
                  <div className="fr-mb-3w">
                    <h4 className="fr-h6 fr-mb-2w">3. Devis</h4>
                    {user.dossiers.devis ? (
                      <dl className="fr-grid-row fr-grid-row--gutters">
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Numéro DS</dt>
                          <dd className="fr-text--sm">{user.dossiers.devis.dsNumber || "—"}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Statut</dt>
                          <dd>
                            <span className="fr-badge">{user.dossiers.devis.dsStatus}</span>
                          </dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Créé le</dt>
                          <dd className="fr-text--sm">{formatDateTime(user.dossiers.devis.createdAt.toISOString())}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Déposé le</dt>
                          <dd className="fr-text--sm">
                            {user.dossiers.devis.submittedAt
                              ? formatDateTime(user.dossiers.devis.submittedAt.toISOString())
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="fr-text--sm">Aucun dossier de devis</p>
                    )}
                  </div>

                  {/* Factures */}
                  <div>
                    <h4 className="fr-h6 fr-mb-2w">4. Factures</h4>
                    {user.dossiers.factures ? (
                      <dl className="fr-grid-row fr-grid-row--gutters">
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Numéro DS</dt>
                          <dd className="fr-text--sm">{user.dossiers.factures.dsNumber || "—"}</dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Statut</dt>
                          <dd>
                            <span className="fr-badge">{user.dossiers.factures.dsStatus}</span>
                          </dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Créé le</dt>
                          <dd className="fr-text--sm">
                            {formatDateTime(user.dossiers.factures.createdAt.toISOString())}
                          </dd>
                        </div>
                        <div className="fr-col-6">
                          <dt className="fr-text--bold">Déposé le</dt>
                          <dd className="fr-text--sm">
                            {user.dossiers.factures.submittedAt
                              ? formatDateTime(user.dossiers.factures.submittedAt.toISOString())
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="fr-text--sm">Aucun dossier de factures</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
