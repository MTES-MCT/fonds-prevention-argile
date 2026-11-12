"use client";

import { useEffect, useState } from "react";
import { LIBELLES_HABILITATION, type StructureAdministration, type TypeHabilitation } from "@/features/backoffice";
import { fermerModale } from "./fermer-modale";
import ModaleStructure, { nommerAgents } from "./ModaleStructure";

interface StructureDetacherModalProps {
  modalId: string;
  structure: StructureAdministration | null;
  onConfirm: (habilitation: TypeHabilitation) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

const AUTRE: Record<TypeHabilitation, TypeHabilitation> = { amo: "allersVers", allersVers: "amo" };

export default function StructureDetacherModal({
  modalId,
  structure,
  onConfirm,
  erreur = null,
  isLoading = false,
}: StructureDetacherModalProps) {
  const [habilitation, setHabilitation] = useState<TypeHabilitation | null>(null);

  useEffect(() => {
    setHabilitation(null);
  }, [structure]);

  const lignes =
    structure?.entrepriseAmo && structure.allersVers
      ? { amo: structure.entrepriseAmo.nom, allersVers: structure.allersVers.nom }
      : null;

  const handleConfirm = async () => {
    if (habilitation && (await onConfirm(habilitation))) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={structure ? `Détacher une habilitation de « ${structure.nom} »` : "Détacher une habilitation"}
      erreur={erreur}
      libelleConfirmation="Détacher"
      libelleEnCours="Détachement..."
      confirmationPossible={!!lignes && !!habilitation}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      {structure && lignes && (
        <>
          <p>
            L&apos;habilitation détachée part dans une nouvelle structure à son nom, sans agent. Les agents restent dans
            « {structure.nom} » ; à rattacher ensuite un par un depuis la page Agents si besoin.
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

          {habilitation && structure.agents.length > 0 && (
            <div className="fr-alert fr-alert--warning fr-alert--sm">
              <p>
                Ces agents perdent le rôle {LIBELLES_HABILITATION[habilitation]} et gardent le rôle{" "}
                {LIBELLES_HABILITATION[AUTRE[habilitation]]}, dès la requête suivante : {nommerAgents(structure.agents)}
                .
              </p>
            </div>
          )}
        </>
      )}
    </ModaleStructure>
  );
}
