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

type ViewId = "liste" | "import";

export default function AllersVersPanel() {
  const [editingAllersVers, setEditingAllersVers] = useState<AllersVersWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<ViewId>("liste");

  // Vérifier les permissions
  const canWrite = useHasPermission(BackofficePermission.ALLERS_VERS_WRITE);
  const canImport = useHasPermission(BackofficePermission.ALLERS_VERS_IMPORT);

  const handleEdit = (allersVers: AllersVersWithRelations) => {
    if (!canWrite) return; // Sécurité supplémentaire
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
    setActiveView("liste");
  }, []);

  return (
    <>
      <div className="w-full">
        {/* En-tête */}
        <div className="fr-mb-6w">
          <h1 className="fr-h2 fr-mb-2w">Gestion des Allers Vers</h1>
          <p className="fr-text--lg fr-text-mention--grey">
            Gérez les structures publiques ou privées qui font connaître le fonds prévention argile.
          </p>
        </div>

        {/* Contrôle segmenté - masquer l'onglet import si pas de permission */}
        <fieldset className="fr-segmented fr-mb-6w">
          <legend className="fr-segmented__legend fr-sr-only">Sélection de la vue Allers Vers</legend>
          <div className="fr-segmented__elements">
            <div className="fr-segmented__element">
              <input
                value="liste"
                checked={activeView === "liste"}
                type="radio"
                id="segmented-allers-vers-1"
                name="segmented-allers-vers"
                onChange={() => setActiveView("liste")}
              />
              <label className="fr-icon-building-fill fr-label" htmlFor="segmented-allers-vers-1">
                Liste des structures
              </label>
            </div>
            {canImport && (
              <div className="fr-segmented__element">
                <input
                  value="import"
                  checked={activeView === "import"}
                  type="radio"
                  id="segmented-allers-vers-2"
                  name="segmented-allers-vers"
                  onChange={() => setActiveView("import")}
                />
                <label className="fr-icon-upload-line fr-label" htmlFor="segmented-allers-vers-2">
                  Import
                </label>
              </div>
            )}
          </div>
        </fieldset>

        {/* Vue Liste */}
        {activeView === "liste" && (
          <div>
            <h2 className="fr-h3 fr-mb-3w">Liste des structures Allers Vers</h2>
            <AllerVersList onEdit={handleEdit} refreshTrigger={refreshTrigger} canEdit={canWrite} />
          </div>
        )}

        {/* Vue Import - seulement si permission */}
        {activeView === "import" && canImport && (
          <div>
            <h2 className="fr-h3 fr-mb-3w">Import des structures Allers Vers</h2>
            <AllersVersSeedUpload onImportSuccess={handleSuccess} />
          </div>
        )}
      </div>

      {/* Modale toujours présente dans le DOM - seulement si permission d'écriture */}
      {editingAllersVers && canWrite && (
        <AllersVersEditModal allersVers={editingAllersVers} onClose={handleCloseModal} onSuccess={handleSuccess} />
      )}
    </>
  );
}
