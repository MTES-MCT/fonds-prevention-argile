"use client";

import { useState, useEffect, useCallback } from "react";
import { AmoSeedUpload } from "./AmoSeedUpload";
import { AmoList } from "./AmoList";
import { AmoEditModal } from "./AmoEditModal";
import type { Amo } from "@/features/parcours/amo";

interface AmoWithRelations extends Amo {
  communes?: { codeInsee: string }[];
  epci?: { codeEpci: string }[];
}

type ViewId = "liste" | "import";

export default function AmoPanel() {
  const [editingAmo, setEditingAmo] = useState<AmoWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<ViewId>("liste");

  const handleEdit = (amo: AmoWithRelations) => {
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
      <div className="w-full">
        {/* En-tête */}
        <div className="fr-mb-6w">
          <h1 className="fr-h2 fr-mb-2w">Gestion des AMO</h1>
          <p className="fr-text--lg fr-text-mention--grey">
            Gérez les Assistants à Maîtrise d'Ouvrage (AMO) et importez de nouvelles entreprises.
          </p>
        </div>

        {/* Contrôle segmenté */}
        <fieldset className="fr-segmented fr-mb-6w">
          <legend className="fr-segmented__legend fr-sr-only">Sélection de la vue AMO</legend>
          <div className="fr-segmented__elements">
            <div className="fr-segmented__element">
              <input
                value="liste"
                checked={activeView === "liste"}
                type="radio"
                id="segmented-amo-1"
                name="segmented-amo"
                onChange={() => setActiveView("liste")}
              />
              <label className="fr-icon-building-fill fr-label" htmlFor="segmented-amo-1">
                Liste des entreprises
              </label>
            </div>
            <div className="fr-segmented__element">
              <input
                value="import"
                checked={activeView === "import"}
                type="radio"
                id="segmented-amo-2"
                name="segmented-amo"
                onChange={() => setActiveView("import")}
              />
              <label className="fr-icon-upload-line fr-label" htmlFor="segmented-amo-2">
                Import
              </label>
            </div>
          </div>
        </fieldset>

        {/* Vue Liste */}
        {activeView === "liste" && (
          <div>
            <h2 className="fr-h3 fr-mb-3w">Liste des entreprises AMO</h2>
            <AmoList onEdit={handleEdit} refreshTrigger={refreshTrigger} />
          </div>
        )}

        {/* Vue Import */}
        {activeView === "import" && (
          <div>
            <h2 className="fr-h3 fr-mb-3w">Import des entreprises AMO</h2>
            <AmoSeedUpload onImportSuccess={handleSuccess} />
          </div>
        )}
      </div>

      {/* Modale toujours présente dans le DOM */}
      {editingAmo && <AmoEditModal amo={editingAmo} onClose={handleCloseModal} onSuccess={handleSuccess} />}
    </>
  );
}
