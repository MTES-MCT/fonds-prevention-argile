"use client";

import { useEffect, useState } from "react";
import type { StructureAdministration } from "@/features/backoffice";
import { fermerModale } from "./fermer-modale";

interface StructureRenommerModalProps {
  modalId: string;
  structure: StructureAdministration | null;
  onConfirm: (nom: string) => Promise<boolean>;
  isLoading?: boolean;
}

export default function StructureRenommerModal({
  modalId,
  structure,
  onConfirm,
  isLoading = false,
}: StructureRenommerModalProps) {
  const [nom, setNom] = useState("");

  useEffect(() => {
    setNom(structure?.nom ?? "");
  }, [structure]);

  const handleConfirm = async () => {
    if (await onConfirm(nom)) fermerModale(modalId);
  };

  return (
    <dialog id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button aria-controls={modalId} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  Renommer la structure
                </h1>
                <p className="text-sm text-(--text-mention-grey)">
                  Le nom de la structure ne sert qu&apos;à l&apos;administration. Les noms de ses lignes AMO et
                  Aller-vers, affichés aux demandeurs, ne changent pas.
                </p>
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`${modalId}-nom`}>
                    Nom
                  </label>
                  <input
                    className="fr-input"
                    type="text"
                    id={`${modalId}-nom`}
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={modalId}>
                      Annuler
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="fr-btn"
                      onClick={handleConfirm}
                      disabled={isLoading || nom.trim() === "" || nom.trim() === structure?.nom}>
                      {isLoading ? "Enregistrement..." : "Renommer"}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
