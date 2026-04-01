"use client";

import { useState, useEffect, useCallback } from "react";
import { AmoSeedUpload } from "./AmoSeedUpload";
import { AmoList } from "./AmoList";
import { AmoEditModal } from "./AmoEditModal";
import { useHasPermission } from "@/features/auth/hooks/usePermissions";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import type { Amo } from "@/features/parcours/amo";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

type AmoTab = "liste" | "import";

interface AmoWithRelations extends Amo {
  communes?: { codeInsee: string }[];
  epci?: { codeEpci: string }[];
}

export default function AmoPanel() {
  const [editingAmo, setEditingAmo] = useState<AmoWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<AmoTab>("liste");

  // Vérifier les permissions
  const canWrite = useHasPermission(BackofficePermission.AMO_WRITE);
  const canImport = useHasPermission(BackofficePermission.AMO_IMPORT);

  const handleEdit = (amo: AmoWithRelations) => {
    if (!canWrite) return;
    setEditingAmo(amo);
  };

  // Ouvrir la modale quand editingAmo change
  useEffect(() => {
    if (editingAmo) {
      const modal = document.getElementById("modal-edit-amo");
      if (modal && window.dsfr) {
        setTimeout(() => {
          window.dsfr?.(modal)?.modal?.disclose();
        }, 0);
      }
    }
  }, [editingAmo]);

  const handleCloseModal = () => {
    setEditingAmo(null);
  };

  const handleSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingAmo(null);
  }, []);

  return (
    <>
      {/* En-tête + onglets — fond blanc */}
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Gestion des AMO" />
          <div className="fr-mb-6w">
            <h1 className="fr-h2 fr-mb-1v">Gestion des AMO</h1>
            <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
              Gérez les Assistants à Maîtrise d'Ouvrage (AMO) et importez de nouvelles entreprises.
            </p>
          </div>

          <div className="fr-tabs" style={{ borderBottom: "none" }}>
            <ul className="fr-tabs__list" role="tablist" aria-label="Vues AMO">
              <li role="presentation">
                <button
                  type="button"
                  className="fr-tabs__tab fr-icon-building-fill fr-tabs__tab--icon-left"
                  tabIndex={activeTab === "liste" ? 0 : -1}
                  role="tab"
                  aria-selected={activeTab === "liste"}
                  aria-controls="tab-amo-liste-panel"
                  onClick={() => setActiveTab("liste")}>
                  Liste des entreprises
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
                    aria-controls="tab-amo-import-panel"
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
            <div id="tab-amo-liste-panel" role="tabpanel">
              <AmoList onEdit={handleEdit} refreshTrigger={refreshTrigger} canEdit={canWrite} />
            </div>
          )}

          {activeTab === "import" && canImport && (
            <div id="tab-amo-import-panel" role="tabpanel">
              <h2 className="fr-h3 fr-mb-3w">Import des entreprises AMO</h2>
              <AmoSeedUpload onImportSuccess={handleSuccess} />
            </div>
          )}
        </div>
      </section>

      {/* Modale d'édition */}
      {editingAmo && canWrite && <AmoEditModal amo={editingAmo} onClose={handleCloseModal} onSuccess={handleSuccess} />}
    </>
  );
}
