"use client";

import { useState, useEffect, useCallback } from "react";
import { AmoSeedUpload } from "./AmoSeedUpload";
import { AmoList } from "./AmoList";
import { AmoEditModal } from "./AmoEditModal";
import { useHasPermission } from "@/features/auth/hooks/usePermissions";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import type { Amo } from "@/features/parcours/amo";

interface AmoWithRelations extends Amo {
  communes?: { codeInsee: string }[];
  epci?: { codeEpci: string }[];
}

export default function AmoPanel() {
  const [editingAmo, setEditingAmo] = useState<AmoWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      {/* En-tête */}
      <section className="fr-container-fluid fr-py-4w">
        <div className="fr-container">
          <h1 className="fr-h2 fr-mb-2w">Gestion des AMO</h1>
          <p className="fr-text--lg" style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
            Gérez les Assistants à Maîtrise d'Ouvrage (AMO) et importez de nouvelles entreprises.
          </p>
        </div>
      </section>

      {/* Onglets + contenu — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="Vues AMO">
              <li role="presentation">
                <button
                  type="button"
                  id="tab-amo-liste"
                  className="fr-tabs__tab fr-icon-building-fill fr-tabs__tab--icon-left"
                  tabIndex={0}
                  role="tab"
                  aria-selected="true"
                  aria-controls="tab-amo-liste-panel">
                  Liste des entreprises
                </button>
              </li>
              {canImport && (
                <li role="presentation">
                  <button
                    type="button"
                    id="tab-amo-import"
                    className="fr-tabs__tab fr-icon-upload-line fr-tabs__tab--icon-left"
                    tabIndex={-1}
                    role="tab"
                    aria-selected="false"
                    aria-controls="tab-amo-import-panel">
                    Import
                  </button>
                </li>
              )}
            </ul>

            <div
              id="tab-amo-liste-panel"
              className="fr-tabs__panel fr-tabs__panel--selected"
              role="tabpanel"
              aria-labelledby="tab-amo-liste"
              tabIndex={0}>
              <AmoList onEdit={handleEdit} refreshTrigger={refreshTrigger} canEdit={canWrite} />
            </div>

            {canImport && (
              <div
                id="tab-amo-import-panel"
                className="fr-tabs__panel"
                role="tabpanel"
                aria-labelledby="tab-amo-import"
                tabIndex={0}>
                <h2 className="fr-h3 fr-mb-3w">Import des entreprises AMO</h2>
                <AmoSeedUpload onImportSuccess={handleSuccess} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modale d'édition */}
      {editingAmo && canWrite && <AmoEditModal amo={editingAmo} onClose={handleCloseModal} onSuccess={handleSuccess} />}
    </>
  );
}
