"use client";

import { useEffect, useState } from "react";
import { LIBELLES_HABILITATION, type StructureAdministration, type TypeHabilitation } from "@/features/backoffice";
import { fermerModale } from "./fermer-modale";

interface StructureDetacherModalProps {
  modalId: string;
  structure: StructureAdministration | null;
  onConfirm: (habilitation: TypeHabilitation) => Promise<boolean>;
  isLoading?: boolean;
}

const AUTRE: Record<TypeHabilitation, TypeHabilitation> = { amo: "allersVers", allersVers: "amo" };

export default function StructureDetacherModal({
  modalId,
  structure,
  onConfirm,
  isLoading = false,
}: StructureDetacherModalProps) {
  const [habilitation, setHabilitation] = useState<TypeHabilitation | null>(null);

  useEffect(() => {
    setHabilitation(null);
  }, [structure]);

  if (!structure?.entrepriseAmo || !structure.allersVers) return null;

  const lignes: Record<TypeHabilitation, string> = {
    amo: structure.entrepriseAmo.nom,
    allersVers: structure.allersVers.nom,
  };
  const actifs = structure.agents.filter((agent) => !agent.desactive);

  const handleConfirm = async () => {
    if (habilitation && (await onConfirm(habilitation))) fermerModale(modalId);
  };

  return (
    <dialog id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button aria-controls={modalId} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  Détacher une habilitation de « {structure.nom} »
                </h1>
                <p>
                  L&apos;habilitation détachée part dans une nouvelle structure à son nom, sans agent. Les agents
                  restent dans « {structure.nom} » ; à rattacher ensuite un par un depuis la page Agents si besoin.
                </p>

                <fieldset className="fr-fieldset">
                  <legend className="fr-fieldset__legend">Habilitation à détacher</legend>
                  {(["amo", "allersVers"] as const).map((type) => (
                    <div key={type} className="fr-fieldset__element">
                      <div className="fr-radio-group">
                        <input
                          type="radio"
                          id={`${modalId}-${type}`}
                          name={`${modalId}-habilitation`}
                          checked={habilitation === type}
                          onChange={() => setHabilitation(type)}
                          disabled={isLoading}
                        />
                        <label className="fr-label" htmlFor={`${modalId}-${type}`}>
                          {LIBELLES_HABILITATION[type]} : {lignes[type]}
                        </label>
                      </div>
                    </div>
                  ))}
                </fieldset>

                {habilitation && actifs.length > 0 && (
                  <div className="fr-alert fr-alert--warning fr-alert--sm">
                    <p>
                      Ces agents perdent le rôle {LIBELLES_HABILITATION[habilitation]} et gardent le rôle{" "}
                      {LIBELLES_HABILITATION[AUTRE[habilitation]]}, dès la requête suivante :{" "}
                      {actifs.map((agent) => agent.nomComplet || agent.email).join(", ")}.
                    </p>
                  </div>
                )}
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
                      disabled={isLoading || !habilitation}>
                      {isLoading ? "Détachement..." : "Détacher"}
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
