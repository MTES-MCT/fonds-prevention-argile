"use client";

import { useState, useEffect } from "react";
import { UsersTable } from "./UsersTable";
import { DepartementFilter } from "./filters/departements/DepartementFilter";
import { filterUsersByDepartement } from "./filters/departements/departementFilter.utils";
import Loading from "@/app/(main)/loading";
import { getUsersWithParcours, UserWithParcoursDetails } from "@/features/backoffice";
import { UsersAmoStats, UsersEtapesStats, UsersSimulationRgaStats } from "./statistiques";
import { useHasPermission } from "@/features/auth/hooks/usePermissions";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";

type StatisticsView = "etape" | "amo" | "simulation";

export default function UsersTrackingPanel() {
  const [users, setUsers] = useState<UserWithParcoursDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartement, setSelectedDepartement] = useState<string>("");
  const [activeView, setActiveView] = useState<StatisticsView>("etape");

  // Vérifier les permissions
  const canViewUserDetails = useHasPermission(BackofficePermission.USERS_DETAIL_READ);

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
        setError(result.error || "Erreur lors du chargement des demandeurs");
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

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full">
      {/* En-tête */}
      <div className="fr-mb-6w">
        <h1 className="fr-h2 fr-mb-2w">Suivi des demandeurs</h1>
        <p className="fr-text--lg fr-text-mention--grey">
          {canViewUserDetails
            ? "Visualisez les informations et le parcours des demandeurs inscrits sur la plateforme."
            : "Consultez les statistiques agrégées des demandeurs inscrits sur la plateforme."}
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="fr-alert fr-alert--error fr-mb-4w">
          <p className="fr-alert__title">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      {/* Contrôle segmenté pour choisir les statistiques */}
      {!error && (
        <div className="fr-mb-4w">
          <p className="fr-h4 fr-mb-2w">Statistiques</p>
          <div className="fr-segmented fr-segmented--no-legend" role="tablist">
            <div className="fr-segmented__elements">
              <div className="fr-segmented__element">
                <input
                  type="radio"
                  id="stats-etape"
                  name="stats-view"
                  checked={activeView === "etape"}
                  onChange={() => setActiveView("etape")}
                />
                <label className="fr-label" htmlFor="stats-etape">
                  <span className="fr-icon-bar-chart-box-fill fr-mr-1w" aria-hidden="true" />
                  Répartition par étape
                </label>
              </div>
              <div className="fr-segmented__element">
                <input
                  type="radio"
                  id="stats-amo"
                  name="stats-view"
                  checked={activeView === "amo"}
                  onChange={() => setActiveView("amo")}
                />
                <label className="fr-label" htmlFor="stats-amo">
                  <span className="fr-icon-user-line fr-mr-1w" aria-hidden="true" />
                  Répartition AMO
                </label>
              </div>
              <div className="fr-segmented__element">
                <input
                  type="radio"
                  id="stats-simulation"
                  name="stats-view"
                  checked={activeView === "simulation"}
                  onChange={() => setActiveView("simulation")}
                />
                <label className="fr-label" htmlFor="stats-simulation">
                  <span className="fr-icon-line-chart-line fr-mr-1w" aria-hidden="true" />
                  Simulation RGA
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques selon la vue sélectionnée */}
      {!error && (
        <div>
          {activeView === "etape" && (
            <UsersEtapesStats users={filteredUsers} selectedDepartement={selectedDepartement} />
          )}
          {activeView === "amo" && <UsersAmoStats users={filteredUsers} selectedDepartement={selectedDepartement} />}
          {activeView === "simulation" && (
            <UsersSimulationRgaStats users={filteredUsers} selectedDepartement={selectedDepartement} />
          )}
        </div>
      )}

      {/* Filtre par département - Seulement si permission de voir les détails */}
      {!error && canViewUserDetails && (
        <>
          <p className="fr-h4 fr-mb-2w">Filtres</p>
          <DepartementFilter
            users={users}
            selectedDepartement={selectedDepartement}
            onDepartementChange={setSelectedDepartement}
          />
        </>
      )}

      {/* Liste des utilisateurs ou message vide - Seulement si permission de voir les détails */}
      {!error && canViewUserDetails && (
        <>
          {filteredUsers.length === 0 && selectedDepartement ? (
            <div className="fr-callout fr-callout--info">
              <p className="fr-callout__text">Aucun demandeur trouvé pour le département {selectedDepartement}.</p>
            </div>
          ) : users.length === 0 ? (
            <div className="fr-callout fr-callout--info">
              <p className="fr-callout__text">Aucun demandeur enregistré pour le moment.</p>
            </div>
          ) : (
            filteredUsers.length > 0 && <UsersTable users={filteredUsers} />
          )}
        </>
      )}
    </div>
  );
}
