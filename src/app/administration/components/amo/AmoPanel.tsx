"use client";

import { useState, useEffect } from "react";
import { AmoSeedUpload } from "./AmoSeedUpload";
import { AmoList } from "./AmoList";
import { AmoEditModal } from "./AmoEditModal";
import type { Amo } from "@/features/parcours/amo";

interface AmoWithRelations extends Amo {
  communes?: { codeInsee: string }[];
  epci?: { codeEpci: string }[];
}

export default function AmoPanel() {
  const [editingAmo, setEditingAmo] = useState<AmoWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = (amo: AmoWithRelations) => {
    setEditingAmo(amo);
  };

  // Ouvrir la modale quand editingAmo change
  useEffect(() => {
    if (editingAmo) {
      const modal = document.getElementById("modal-edit-amo");
      if (modal && window.dsfr) {
        // Attendre que le DOM soit mis à jour
        setTimeout(() => {
          window.dsfr?.(modal)?.modal?.disclose();
        }, 0);
      }
    }
  }, [editingAmo]);

  const handleCloseModal = () => {
    setEditingAmo(null);
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingAmo(null);
  };

  return (
    <>
      <div className="w-full">
        <div className="fr-tabs">
          <ul className="fr-tabs__list" role="tablist" aria-label="Système d'onglets statistiques">
            <li role="presentation">
              <button
                type="button"
                id="amo-tab-0"
                className="fr-tabs__tab"
                tabIndex={0}
                role="tab"
                aria-selected="true"
                aria-controls="amo-tab-0-panel">
                Listes des entreprises AMO
              </button>
            </li>

            <li role="presentation">
              <button
                type="button"
                id="amo-tab-1"
                className="fr-tabs__tab"
                tabIndex={-1}
                role="tab"
                aria-selected="false"
                aria-controls="amo-tab-1-panel">
                Import des entreprises AMO
              </button>
            </li>
          </ul>

          <div
            id="amo-tab-0-panel"
            className="fr-tabs__panel fr-tabs__panel--selected"
            role="tabpanel"
            aria-labelledby="amo-tab-0"
            tabIndex={0}>
            <AmoList onEdit={handleEdit} refreshTrigger={refreshTrigger} />
          </div>

          <div id="amo-tab-1-panel" className="fr-tabs__panel" role="tabpanel" aria-labelledby="amo-tab-1" tabIndex={0}>
            <AmoSeedUpload onImportSuccess={handleSuccess} />
          </div>
        </div>
      </div>

      {/* Modale toujours présente dans le DOM */}
      {editingAmo && <AmoEditModal amo={editingAmo} onClose={handleCloseModal} onSuccess={handleSuccess} />}
    </>
  );
}
