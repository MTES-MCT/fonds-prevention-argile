"use client";

import { useEffect, useMemo, useState } from "react";
import {
  effetFusion,
  LIBELLES_HABILITATION,
  refusFusion,
  type StructureAdministration,
  type TypeHabilitation,
} from "@/features/backoffice";
import { fermerModale } from "./fermer-modale";

interface StructureFusionModalProps {
  modalId: string;
  cible: StructureAdministration | null;
  structures: StructureAdministration[];
  onConfirm: (source: StructureAdministration) => Promise<boolean>;
  isLoading?: boolean;
}

function habilitations(structure: StructureAdministration) {
  return { amo: !!structure.entrepriseAmo, allersVers: !!structure.allersVers };
}

function libelleGains(gains: TypeHabilitation[]): string {
  return gains.map((type) => LIBELLES_HABILITATION[type]).join(" et ");
}

function GainsAgents({ structure, gains }: { structure: StructureAdministration; gains: TypeHabilitation[] }) {
  const actifs = structure.agents.filter((agent) => !agent.desactive);
  if (gains.length === 0 || actifs.length === 0) return null;

  return (
    <li>
      Les agents de « {structure.nom} » gagnent le rôle {libelleGains(gains)} :{" "}
      {actifs.map((agent) => agent.nomComplet || agent.email).join(", ")}.
    </li>
  );
}

export default function StructureFusionModal({
  modalId,
  cible,
  structures,
  onConfirm,
  isLoading = false,
}: StructureFusionModalProps) {
  const [sourceId, setSourceId] = useState("");

  useEffect(() => {
    setSourceId("");
  }, [cible]);

  const compatibles = useMemo(
    () =>
      cible
        ? structures.filter(
            (structure) =>
              !refusFusion(
                { id: cible.id, habilitations: habilitations(cible) },
                { id: structure.id, habilitations: habilitations(structure) }
              )
          )
        : [],
    [cible, structures]
  );

  if (!cible) return null;

  const source = compatibles.find((structure) => structure.id === sourceId) ?? null;
  const effet = source ? effetFusion(habilitations(cible), habilitations(source)) : null;

  const handleConfirm = async () => {
    if (source && (await onConfirm(source))) fermerModale(modalId);
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
                  Fusionner une structure dans « {cible.nom} »
                </h1>
                <p>
                  La structure choisie disparaît : son habilitation et ses agents rejoignent « {cible.nom} », qui garde
                  son nom. Seules sont proposées les structures dont les habilitations complètent celles de «{" "}
                  {cible.nom} ».
                </p>

                {compatibles.length === 0 ? (
                  <div className="fr-alert fr-alert--info fr-alert--sm">
                    <p>Aucune structure ne peut rejoindre celle-ci : elles ont déjà une habilitation du même type.</p>
                  </div>
                ) : (
                  <div className="fr-select-group">
                    <label className="fr-label" htmlFor={`${modalId}-source`}>
                      Structure à fusionner
                    </label>
                    <select
                      className="fr-select"
                      id={`${modalId}-source`}
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      disabled={isLoading}>
                      <option value="" disabled>
                        Sélectionner une structure
                      </option>
                      {compatibles.map((structure) => (
                        <option key={structure.id} value={structure.id}>
                          {structure.nom}
                          {structure.entrepriseAmo ? " (AMO)" : ""}
                          {structure.allersVers ? " (Aller-vers)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {source && effet && (
                  <div className="fr-alert fr-alert--warning fr-alert--sm fr-mt-2w">
                    <p>
                      La fusion change des droits dès la requête suivante, sessions ouvertes comprises. Les agents de la
                      structure fusionnée verront les dossiers des habilitations gagnées.
                    </p>
                    <ul className="fr-mt-1v">
                      <GainsAgents structure={cible} gains={effet.gainsAgentsCible} />
                      <GainsAgents structure={source} gains={effet.gainsAgentsSource} />
                    </ul>
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
                    <button type="button" className="fr-btn" onClick={handleConfirm} disabled={isLoading || !source}>
                      {isLoading ? "Fusion..." : "Fusionner"}
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
