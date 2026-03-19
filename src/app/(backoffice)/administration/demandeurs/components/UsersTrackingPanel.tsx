"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { UsersTable } from "./UsersTable";
import {
  filterUsersByDepartement,
  extractUniqueDepartements,
  countUsersByDepartement,
  countUsersWithoutDepartement,
  AUCUN_DEPARTEMENT,
} from "./filters/departements/departementFilter.utils";
import Loading from "@/app/(main)/loading";
import { getUsersForStats, getUsersWithParcours, UserWithParcoursDetails } from "@/features/backoffice";
import { useHasPermission } from "@/features/auth/hooks/usePermissions";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { Pagination } from "@/shared/components/Pagination/Pagination";
import { formatNomComplet } from "@/shared/utils";
import { getDepartementName, toOfficialCodeDepartement } from "@/shared/constants/departements.constants";

const STEP_LABELS: Record<Step, string> = {
  [Step.CHOIX_AMO]: "1. Sélection d'un AMO",
  [Step.ELIGIBILITE]: "2. Formulaire d'éligibilité",
  [Step.DIAGNOSTIC]: "3. Diagnostic",
  [Step.DEVIS]: "4. Devis",
  [Step.FACTURES]: "5. Factures",
};

export default function UsersTrackingPanel() {
  const [users, setUsers] = useState<UserWithParcoursDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [selectedDepartement, setSelectedDepartement] = useState<string>("");
  const [selectedStep, setSelectedStep] = useState<Step | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination par onglet
  const [pageActifs, setPageActifs] = useState(1);
  const [pageSizeActifs, setPageSizeActifs] = useState(20);
  const [pageArchives, setPageArchives] = useState(1);
  const [pageSizeArchives, setPageSizeArchives] = useState(20);

  // Permissions
  const canViewUserDetails = useHasPermission(BackofficePermission.USERS_DETAIL_READ);
  const canReadUsers = useHasPermission(BackofficePermission.USERS_READ);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = canReadUsers ? await getUsersWithParcours() : await getUsersForStats();

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
  }, [canReadUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Pipeline de filtrage
  const { activeUsers, archivedUsers } = useMemo(() => {
    // 1. Split actifs / archivés
    const actifs: UserWithParcoursDetails[] = [];
    const archives: UserWithParcoursDetails[] = [];

    for (const user of users) {
      const situation = user.parcours?.situationParticulier;
      if (situation === SituationParticulier.ARCHIVE) {
        archives.push(user);
      } else {
        actifs.push(user);
      }
    }

    // 2. Appliquer filtres communs
    const applyFilters = (list: UserWithParcoursDetails[]) => {
      let filtered = list;

      // Filtre département
      if (selectedDepartement) {
        filtered = filterUsersByDepartement(filtered, selectedDepartement);
      }

      // Filtre étape
      if (selectedStep) {
        filtered = filtered.filter((u) => u.parcours?.currentStep === selectedStep);
      }

      // Filtre recherche
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        filtered = filtered.filter((u) => {
          const nom = formatNomComplet(u.user.firstName, u.user.name).toLowerCase();
          return nom.includes(query);
        });
      }

      return filtered;
    };

    return {
      activeUsers: applyFilters(actifs),
      archivedUsers: applyFilters(archives),
    };
  }, [users, selectedDepartement, selectedStep, searchQuery]);

  // Pagination
  const paginatedActifs = useMemo(
    () => activeUsers.slice((pageActifs - 1) * pageSizeActifs, pageActifs * pageSizeActifs),
    [activeUsers, pageActifs, pageSizeActifs]
  );

  const paginatedArchives = useMemo(
    () => archivedUsers.slice((pageArchives - 1) * pageSizeArchives, pageArchives * pageSizeArchives),
    [archivedUsers, pageArchives, pageSizeArchives]
  );

  // Départements disponibles
  const departements = useMemo(() => extractUniqueDepartements(users), [users]);
  const hasUsersWithoutDept = useMemo(() => countUsersWithoutDepartement(users) > 0, [users]);

  // Reset page sur changement de filtre
  const handleDepartementChange = (value: string) => {
    setSelectedDepartement(value);
    setPageActifs(1);
    setPageArchives(1);
  };

  const handleStepChange = (value: string) => {
    setSelectedStep(value as Step | "");
    setPageActifs(1);
    setPageArchives(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPageActifs(1);
    setPageArchives(1);
  };

  const handlePageSizeActifsChange = (size: number) => {
    setPageSizeActifs(size);
    setPageActifs(1);
  };

  const handlePageSizeArchivesChange = (size: number) => {
    setPageSizeArchives(size);
    setPageArchives(1);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      {/* En-tete — fond blanc */}
      <section className="fr-container-fluid fr-py-4w">
        <div className="fr-container">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="fr-h2 fr-mb-1v">Demandeurs</h1>
              <p className="fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
                {canViewUserDetails
                  ? "Visualisez les informations et le parcours des demandeurs inscrits sur la plateforme."
                  : "Consultez les statistiques agrégées des demandeurs inscrits sur la plateforme."}
              </p>
            </div>

            {/* Filtres contextuels */}
            {canViewUserDetails && (
              <div className="flex items-end gap-4" style={{ flexShrink: 0 }}>
                <div className="fr-select-group fr-mb-0">
                  <label className="fr-label" htmlFor="filtre-etape" style={{ whiteSpace: "nowrap" }}>
                    Étape
                  </label>
                  <select
                    className="fr-select"
                    id="filtre-etape"
                    value={selectedStep}
                    onChange={(e) => handleStepChange(e.target.value)}>
                    <option value="">Toutes les étapes</option>
                    {Object.entries(STEP_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fr-select-group fr-mb-0">
                  <label className="fr-label" htmlFor="filtre-departement" style={{ whiteSpace: "nowrap" }}>
                    Département
                  </label>
                  <select
                    className="fr-select"
                    id="filtre-departement"
                    value={selectedDepartement}
                    onChange={(e) => handleDepartementChange(e.target.value)}>
                    <option value="">Tous les départements</option>
                    {departements.map((dept) => {
                      const officialCode = toOfficialCodeDepartement(dept);
                      const name = getDepartementName(dept);
                      const count = countUsersByDepartement(users, dept);
                      return (
                        <option key={dept} value={dept}>
                          {officialCode} - {name} ({count})
                        </option>
                      );
                    })}
                    {hasUsersWithoutDept && (
                      <option value={AUCUN_DEPARTEMENT}>
                        Aucun département ({countUsersWithoutDepartement(users)})
                      </option>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <div className="fr-alert fr-alert--error fr-mt-2w">
              <p className="fr-alert__title">Erreur</p>
              <p>{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Contenu — fond bleu */}
      {!error && canViewUserDetails && (
        <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            {/* Barre de recherche */}
            <div className="fr-search-bar fr-mb-4w" role="search" style={{ maxWidth: "400px" }}>
              <label className="fr-label" htmlFor="search-demandeurs">
                Rechercher
              </label>
              <input
                className="fr-input"
                placeholder="Rechercher"
                type="search"
                id="search-demandeurs"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <button className="fr-btn" title="Rechercher">
                Rechercher
              </button>
            </div>

            {/* Onglets DSFR */}
            <div className="fr-tabs">
              <ul className="fr-tabs__list" role="tablist" aria-label="Demandeurs">
                <li role="presentation">
                  <button
                    type="button"
                    id="tab-actifs"
                    className="fr-tabs__tab"
                    tabIndex={0}
                    role="tab"
                    aria-selected="true"
                    aria-controls="tab-actifs-panel">
                    <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{activeUsers.length}</p>
                    <span className="fr-icon-play-circle-line fr-icon--sm fr-mr-1v" aria-hidden="true" />
                    Actifs
                  </button>
                </li>
                <li role="presentation">
                  <button
                    type="button"
                    id="tab-archives"
                    className="fr-tabs__tab"
                    tabIndex={-1}
                    role="tab"
                    aria-selected="false"
                    aria-controls="tab-archives-panel">
                    <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{archivedUsers.length}</p>
                    <span className="fr-icon-folder-2-line fr-icon--sm fr-mr-1v" aria-hidden="true" />
                    Archivés
                  </button>
                </li>
              </ul>

              {/* Panel Actifs */}
              <div
                id="tab-actifs-panel"
                className="fr-tabs__panel fr-tabs__panel--selected"
                role="tabpanel"
                aria-labelledby="tab-actifs"
                tabIndex={0}>
                {activeUsers.length === 0 ? (
                  <div className="fr-callout fr-callout--info">
                    <p className="fr-callout__text">Aucun demandeur actif trouvé avec ces filtres.</p>
                  </div>
                ) : (
                  <>
                    <UsersTable users={paginatedActifs} />
                    <Pagination
                      currentPage={pageActifs}
                      totalItems={activeUsers.length}
                      pageSize={pageSizeActifs}
                      onPageChange={setPageActifs}
                      onPageSizeChange={handlePageSizeActifsChange}
                    />
                  </>
                )}
              </div>

              {/* Panel Archivés */}
              <div
                id="tab-archives-panel"
                className="fr-tabs__panel"
                role="tabpanel"
                aria-labelledby="tab-archives"
                tabIndex={0}>
                {archivedUsers.length === 0 ? (
                  <div className="fr-callout fr-callout--info">
                    <p className="fr-callout__text">Aucun demandeur archivé trouvé avec ces filtres.</p>
                  </div>
                ) : (
                  <>
                    <UsersTable users={paginatedArchives} />
                    <Pagination
                      currentPage={pageArchives}
                      totalItems={archivedUsers.length}
                      pageSize={pageSizeArchives}
                      onPageChange={setPageArchives}
                      onPageSizeChange={handlePageSizeArchivesChange}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
