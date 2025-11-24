"use client";

import { useState, useEffect } from "react";
import { getUsersWithParcours } from "@/features/parcours/core/actions";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import Loading from "@/app/loading";
import { UsersTable } from "./UsersTable";
import { UserWithParcoursDetails } from "@/features/parcours/core";
import { DepartementFilter } from "./filters/departements/DepartementFilter";
import { filterUsersByDepartement } from "./filters/departements/departementFilter.utils";

/**
 * Calcule les statistiques de tracking email
 */
function getEmailTrackingStats(users: UserWithParcoursDetails[]) {
  const usersWithAmo = users.filter((u) => u.amoValidation !== null);

  return {
    total: usersWithAmo.length,
    envoyes: usersWithAmo.filter((u) => u.amoValidation?.emailTracking.sentAt).length,
    delivres: usersWithAmo.filter((u) => u.amoValidation?.emailTracking.deliveredAt).length,
    ouverts: usersWithAmo.filter((u) => u.amoValidation?.emailTracking.openedAt).length,
    cliques: usersWithAmo.filter((u) => u.amoValidation?.emailTracking.clickedAt).length,
    bouncesSoft: usersWithAmo.filter((u) => u.amoValidation?.emailTracking.bounceType === "soft").length,
    bouncesHard: usersWithAmo.filter((u) => u.amoValidation?.emailTracking.bounceType === "hard").length,
  };
}

/**
 * Calcule le pourcentage avec gestion du cas 0
 */
function getPercentage(value: number, total: number): string {
  if (total === 0) return "0";
  return Math.round((value / total) * 100).toString();
}

export default function UsersTrackingPanel() {
  const [users, setUsers] = useState<UserWithParcoursDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartement, setSelectedDepartement] = useState<string>("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getUsersWithParcours();

      if (result.success) {
        setUsers(result.data);
      } else {
        setError(result.error || "Erreur lors du chargement des utilisateurs");
      }
    } catch (err) {
      console.error("Erreur loadUsers:", err);
      setError("Erreur inattendue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer les users par département si un filtre est actif
  const filteredUsers = selectedDepartement ? filterUsersByDepartement(users, selectedDepartement) : users;

  // Calcul des statistiques (basé sur les users filtrés)
  const stats = {
    total: filteredUsers.length,
    avecAmo: filteredUsers.filter((u) => u.amoValidation !== null).length,
    amoValidee: filteredUsers.filter((u) => u.amoValidation?.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE).length,
    amoEnAttente: filteredUsers.filter((u) => u.amoValidation?.statut === StatutValidationAmo.EN_ATTENTE).length,
    amoRefusee: filteredUsers.filter((u) => u.amoValidation?.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE)
      .length,
    parEtape: {
      choixAmo: filteredUsers.filter((u) => u.parcours?.currentStep === Step.CHOIX_AMO).length,
      eligibilite: filteredUsers.filter((u) => u.parcours?.currentStep === Step.ELIGIBILITE).length,
      diagnostic: filteredUsers.filter((u) => u.parcours?.currentStep === Step.DIAGNOSTIC).length,
      devis: filteredUsers.filter((u) => u.parcours?.currentStep === Step.DEVIS).length,
      factures: filteredUsers.filter((u) => u.parcours?.currentStep === Step.FACTURES).length,
    },
  };

  // Calcul des statistiques email
  const emailStats = getEmailTrackingStats(filteredUsers);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full">
      <h2 className="fr-h4 fr-mb-4w">Suivi des utilisateurs</h2>

      {/* Erreur */}
      {error && (
        <div className="fr-alert fr-alert--error fr-mb-4w">
          <p className="fr-alert__title">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      {/* Statistiques */}
      {!error && (
        <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
          {/* Total utilisateurs */}
          <div className="fr-col-12 fr-col-md-3">
            <div className="fr-card fr-card--no-border">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <p className="fr-card__title fr-text--lg fr-mb-1v">{stats.total}</p>
                  <p className="fr-text--sm">Utilisateurs {selectedDepartement ? "filtrés" : "inscrits"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AMO validée */}
          <div className="fr-col-12 fr-col-md-3">
            <div className="fr-card fr-card--no-border">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <p className="fr-card__title fr-text--lg fr-mb-1v">{stats.amoValidee}</p>
                  <p className="fr-text--sm">AMO validée</p>
                </div>
              </div>
            </div>
          </div>

          {/* AMO en attente */}
          <div className="fr-col-12 fr-col-md-3">
            <div className="fr-card fr-card--no-border">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <p className="fr-card__title fr-text--lg fr-mb-1v">{stats.amoEnAttente}</p>
                  <p className="fr-text--sm">AMO en attente</p>
                </div>
              </div>
            </div>
          </div>

          {/* AMO refusée */}
          <div className="fr-col-12 fr-col-md-3">
            <div className="fr-card fr-card--no-border">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <p className="fr-card__title fr-text--lg fr-mb-1v">{stats.amoRefusee}</p>
                  <p className="fr-text--sm">AMO refusée</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Répartition par étape */}
      {!error && stats.total > 0 && (
        <div className="fr-callout fr-callout--blue-ecume fr-mb-4w">
          <h3 className="fr-callout__title">Répartition par étape</h3>
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Choix AMO :</strong> {stats.parEtape.choixAmo}
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Éligibilité :</strong> {stats.parEtape.eligibilite}
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Diagnostic :</strong> {stats.parEtape.diagnostic}
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Devis :</strong> {stats.parEtape.devis}
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Factures :</strong> {stats.parEtape.factures}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques emails AMO */}
      {!error && emailStats.total > 0 && (
        <div className="fr-callout fr-callout--green-emeraude fr-mb-4w">
          <h3 className="fr-callout__title">Suivi des emails AMO</h3>
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Envoyés :</strong> {emailStats.envoyes}/{emailStats.total}
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Délivrés :</strong> {emailStats.delivres}{" "}
                <span className="fr-text--xs">({getPercentage(emailStats.delivres, emailStats.envoyes)}%)</span>
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Ouverts :</strong> {emailStats.ouverts}{" "}
                <span className="fr-text--xs">({getPercentage(emailStats.ouverts, emailStats.delivres)}%)</span>
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Cliqués :</strong> {emailStats.cliques}{" "}
                <span className="fr-text--xs">({getPercentage(emailStats.cliques, emailStats.ouverts)}%)</span>
              </p>
            </div>
            <div className="fr-col">
              <p className="fr-text--sm fr-mb-0">
                <strong>Erreurs :</strong>{" "}
                <span className={emailStats.bouncesHard > 0 ? "fr-text--error" : ""}>
                  {emailStats.bouncesHard + emailStats.bouncesSoft}
                </span>
                {emailStats.bouncesHard > 0 && (
                  <span className="fr-text--xs fr-text--error"> ({emailStats.bouncesHard} définitives)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtre par département */}
      {!error && (
        <DepartementFilter
          users={users}
          selectedDepartement={selectedDepartement}
          onDepartementChange={setSelectedDepartement}
        />
      )}

      {/* Liste des utilisateurs ou message vide */}
      {!error && filteredUsers.length === 0 && selectedDepartement ? (
        <div className="fr-callout fr-callout--info">
          <p className="fr-callout__text">Aucun utilisateur trouvé pour le département {selectedDepartement}.</p>
        </div>
      ) : !error && users.length === 0 ? (
        <div className="fr-callout fr-callout--info">
          <p className="fr-callout__text">Aucun utilisateur enregistré pour le moment.</p>
        </div>
      ) : (
        <div>{!error && filteredUsers.length > 0 && <UsersTable users={filteredUsers} />}</div>
      )}
    </div>
  );
}
