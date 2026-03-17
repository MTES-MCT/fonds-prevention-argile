"use client";

import { useState, useEffect, useCallback } from "react";
import { AllersVersSeedUpload } from "./AllersVersSeedUpload";
import { AllerVersList } from "./AllerVersList";
import { AllersVersEditModal } from "./AllersVersEditModal";
import { useHasPermission } from "@/features/auth/hooks/usePermissions";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import type { AllersVers } from "@/features/seo/allers-vers";

interface AllersVersWithRelations extends AllersVers {
  departements?: { codeDepartement: string }[];
  epci?: { codeEpci: string }[];
}

export default function AllersVersPanel() {
  const [editingAllersVers, setEditingAllersVers] = useState<AllersVersWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Vérifier les permissions
  const canWrite = useHasPermission(BackofficePermission.ALLERS_VERS_WRITE);
  const canImport = useHasPermission(BackofficePermission.ALLERS_VERS_IMPORT);

  const handleEdit = (allersVers: AllersVersWithRelations) => {
    if (!canWrite) return;
    setEditingAllersVers(allersVers);
  };

  // Ouvrir la modale quand editingAllersVers change
  useEffect(() => {
    if (editingAllersVers) {
      const modal = document.getElementById("modal-edit-allers-vers");
      if (modal && window.dsfr) {
        setTimeout(() => {
          window.dsfr?.(modal)?.modal?.disclose();
        }, 0);
      }
    }
  }, [editingAllersVers]);

  const handleCloseModal = () => {
    setEditingAllersVers(null);
  };

  const handleSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingAllersVers(null);
  }, []);

  return (
    <>
      {/* En-tête */}
      <section className="fr-container-fluid fr-py-4w">
        <div className="fr-container">
          <h1 className="fr-h2 fr-mb-2w">Gestion des Allers Vers</h1>
          <p className="fr-text--lg" style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
            Gérez les structures publiques ou privées qui font connaître le fonds prévention argile.
          </p>
        </div>
      </section>

      {/* Onglets + contenu — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="Vues Allers Vers">
              <li role="presentation">
                <button
                  type="button"
                  id="tab-allers-vers-liste"
                  className="fr-tabs__tab fr-icon-building-fill fr-tabs__tab--icon-left"
                  tabIndex={0}
                  role="tab"
                  aria-selected="true"
                  aria-controls="tab-allers-vers-liste-panel">
                  Liste des structures
                </button>
              </li>
              {canImport && (
                <li role="presentation">
                  <button
                    type="button"
                    id="tab-allers-vers-import"
                    className="fr-tabs__tab fr-icon-upload-line fr-tabs__tab--icon-left"
                    tabIndex={-1}
                    role="tab"
                    aria-selected="false"
                    aria-controls="tab-allers-vers-import-panel">
                    Import
                  </button>
                </li>
              )}
            </ul>

            <div
              id="tab-allers-vers-liste-panel"
              className="fr-tabs__panel fr-tabs__panel--selected"
              role="tabpanel"
              aria-labelledby="tab-allers-vers-liste"
              tabIndex={0}>
              <AllerVersList onEdit={handleEdit} refreshTrigger={refreshTrigger} canEdit={canWrite} />
            </div>

            {canImport && (
              <div
                id="tab-allers-vers-import-panel"
                className="fr-tabs__panel"
                role="tabpanel"
                aria-labelledby="tab-allers-vers-import"
                tabIndex={0}>
                <h2 className="fr-h3 fr-mb-3w">Import des structures Allers Vers</h2>
                <AllersVersSeedUpload onImportSuccess={handleSuccess} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modale d'édition */}
      {editingAllersVers && canWrite && (
        <AllersVersEditModal allersVers={editingAllersVers} onClose={handleCloseModal} onSuccess={handleSuccess} />
      )}
    </>
  );
}
