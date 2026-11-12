"use client";

import { useEffect, useState } from "react";
import {
  habilitationsDeLignes,
  LIBELLES_HABILITATION,
  ligneDeType,
  refusDetachement,
  roleApresDetachement,
  TYPES_HABILITATION,
  type StructureAdministration,
  type TypeHabilitation,
} from "@/features/backoffice";
import { roleDepuisStructure } from "@/shared/domain/value-objects";
import { libelleRoleDeStructure } from "./libelles-role";
import { fermerModale } from "./fermer-modale";
import ModaleStructure, { nommerAgents } from "./ModaleStructure";

interface StructureDetacherModalProps {
  modalId: string;
  structure: StructureAdministration | null;
  onConfirm: (habilitation: TypeHabilitation) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

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

  const habilitations = structure ? habilitationsDeLignes(structure) : null;
  const detachable = !!habilitations && !refusDetachement(habilitations);
  const typesPresents = structure ? TYPES_HABILITATION.filter((type) => ligneDeType(structure, type)) : [];
  const roleRestant = habilitations && habilitation ? roleApresDetachement(habilitations, habilitation) : null;
  const roleAvant = habilitations ? roleDepuisStructure(habilitations) : null;

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
      confirmationPossible={detachable && !!habilitation}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      {structure && detachable && (
        <>
          <p>
            L&apos;habilitation détachée part dans une nouvelle structure à son nom, sans agent. Les agents restent dans
            « {structure.nom} » ; à rattacher ensuite un par un depuis la page Agents si besoin.
          </p>

          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Habilitation à détacher</legend>
            {typesPresents.map((type) => (
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
                    {LIBELLES_HABILITATION[type]} : {ligneDeType(structure, type)?.nom}
                  </label>
                </div>
              </div>
            ))}
          </fieldset>

          {habilitation && structure.agents.length > 0 && roleRestant !== roleAvant && (
            <div className="fr-alert fr-alert--warning fr-alert--sm">
              <p>
                Ces agents perdent le rôle {LIBELLES_HABILITATION[habilitation]}
                {roleRestant
                  ? ` et gardent le rôle ${libelleRoleDeStructure(roleRestant)}`
                  : " et n'ont plus aucun rôle"}
                , dès la requête suivante : {nommerAgents(structure.agents)}.
              </p>
            </div>
          )}
        </>
      )}
    </ModaleStructure>
  );
}
