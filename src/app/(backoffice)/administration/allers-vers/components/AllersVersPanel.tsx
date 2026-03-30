"use client";

import { useState, useEffect, useCallback } from "react";
import { AllersVersSeedUpload } from "./AllersVersSeedUpload";
import { AllerVersList } from "./AllerVersList";
import { AllersVersEditModal } from "./AllersVersEditModal";
import { useHasPermission } from "@/features/auth/hooks/usePermissions";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import type { AllersVers } from "@/features/seo/allers-vers";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

type AllersVersTab = "liste" | "import";

interface AllersVersWithRelations extends AllersVers {
  departements?: { codeDepartement: string }[];
  epci?: { codeEpci: string }[];
}

export default function AllersVersPanel() {
  const [editingAllersVers, setEditingAllersVers] = useState<AllersVersWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<AllersVersTab>("liste");

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
      {/* En-tête + onglets — fond blanc */}
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Gestion des Allers Vers" />
          <div className="fr-mb-6w">
            <h1 className="fr-h2 fr-mb-1v">Gestion des Allers Vers</h1>
            <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
              Gérez les structures publiques ou privées qui font connaître le fonds prévention argile.
            </p>
          </div>

          <div className="fr-tabs" style={{ borderBottom: "none" }}>
            <ul className="fr-tabs__list" role="tablist" aria-label="Vues Allers Vers">
              <li role="presentation">
                <button
                  type="button"
                  className="fr-tabs__tab fr-icon-building-fill fr-tabs__tab--icon-left"
                  tabIndex={activeTab === "liste" ? 0 : -1}
                  role="tab"
                  aria-selected={activeTab === "liste"}
                  aria-controls="tab-allers-vers-liste-panel"
                  onClick={() => setActiveTab("liste")}>
                  Liste des structures
                </button>
              </li>
              {canImport && (
                <li role="presentation">
                  <button
                    type="button"
                    className="fr-tabs__tab fr-icon-upload-line fr-tabs__tab--icon-left"
                    tabIndex={activeTab === "import" ? 0 : -1}
                    role="tab"
                    aria-selected={activeTab === "import"}
                    aria-controls="tab-allers-vers-import-panel"
                    onClick={() => setActiveTab("import")}>
                    Import
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Contenu — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {activeTab === "liste" && (
            <div id="tab-allers-vers-liste-panel" role="tabpanel">
              <AllerVersList onEdit={handleEdit} refreshTrigger={refreshTrigger} canEdit={canWrite} />
            </div>
          )}

          {activeTab === "import" && canImport && (
            <div id="tab-allers-vers-import-panel" role="tabpanel">
              <h2 className="fr-h3 fr-mb-3w">Import des structures Allers Vers</h2>
              <AllersVersSeedUpload onImportSuccess={handleSuccess} />
            </div>
          )}
        </div>
      </section>

      {/* Modale d'édition */}
      {editingAllersVers && canWrite && (
        <AllersVersEditModal allersVers={editingAllersVers} onClose={handleCloseModal} onSuccess={handleSuccess} />
      )}
    </>
  );
}
