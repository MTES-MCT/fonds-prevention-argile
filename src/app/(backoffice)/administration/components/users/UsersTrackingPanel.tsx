"use client";

import { useState, useEffect } from "react";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { UsersTable } from "./UsersTable";
import { DepartementFilter } from "./filters/departements/DepartementFilter";
import { filterUsersByDepartement } from "./filters/departements/departementFilter.utils";
import Loading from "@/app/(main)/loading";
import { getUsersWithParcours, UserWithParcoursDetails } from "@/features/backoffice";
import StatCard from "../shared/StatCard";

/**
 * Calcule le pourcentage avec gestion du cas 0
 */
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

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full">
      {/* En-tête */}
      <div className="fr-mb-6w">
        <h1 className="fr-h2 fr-mb-2w">Suivi des utilisateurs</h1>
        <p className="fr-text--lg fr-text-mention--grey">
          Visualisez les informations et le parcours des utilisateurs inscrits sur la plateforme.
        </p>
      </div>

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
          <StatCard
            number={stats.total.toString()}
            label={`Utilisateurs ${selectedDepartement ? "filtrés" : "inscrits"}`}
          />

          {/* AMO validée */}
          <StatCard number={stats.amoValidee.toString()} label="AMO validée" />

          {/* AMO en attente */}
          <StatCard number={stats.amoEnAttente.toString()} label="AMO en attente" />

          {/* AMO refusée */}
          <StatCard number={stats.amoRefusee.toString()} label="AMO refusée" />
        </div>
      )}

      {/* Répartition par étape */}
      {!error && stats.total > 0 && (
        <div className="fr-mb-6w">
          <h2 className="fr-h2 fr-mb-2w">Répartition par étape</h2>
          <p className="fr-text--lg fr-text-mention--grey">
            Nombre d'utilisateurs actuellement à chaque étape du parcours.
          </p>

          <div className="fr-grid-row fr-grid-row--gutters">
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Choix AMO"
              number={stats.parEtape.choixAmo.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Éligibilité"
              number={stats.parEtape.eligibilite.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Diagnostic"
              number={stats.parEtape.diagnostic.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Devis"
              number={stats.parEtape.devis.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Factures"
              number={stats.parEtape.factures.toString()}
            />
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
