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
import ModaleStructure, { nommerAgents } from "./ModaleStructure";

interface StructureFusionModalProps {
  modalId: string;
  cible: StructureAdministration | null;
  structures: StructureAdministration[];
  onConfirm: (source: StructureAdministration) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

function habilitations(structure: StructureAdministration) {
  return { amo: !!structure.entrepriseAmo, allersVers: !!structure.allersVers };
}

function GainsAgents({ structure, gains }: { structure: StructureAdministration; gains: TypeHabilitation[] }) {
  if (gains.length === 0 || structure.agents.length === 0) return null;

  return (
    <li>
      Les agents de « {structure.nom} » gagnent le rôle {gains.map((type) => LIBELLES_HABILITATION[type]).join(" et ")}{" "}
      : {nommerAgents(structure.agents)}.
    </li>
  );
}

export default function StructureFusionModal({
  modalId,
  cible,
  structures,
  onConfirm,
  erreur = null,
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

  const source = compatibles.find((structure) => structure.id === sourceId) ?? null;
  const effet = cible && source ? effetFusion(habilitations(cible), habilitations(source)) : null;

  const handleConfirm = async () => {
    if (source && (await onConfirm(source))) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={cible ? `Fusionner une structure dans « ${cible.nom} »` : "Fusionner une structure"}
      erreur={erreur}
      libelleConfirmation="Fusionner"
      libelleEnCours="Fusion..."
      confirmationPossible={!!source}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      {cible && (
        <>
          <p>
            La structure choisie disparaît : son habilitation et ses agents rejoignent « {cible.nom} », qui garde son
            nom. Seules sont proposées les structures dont les habilitations complètent celles de « {cible.nom} ».
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
                La fusion change des droits dès la requête suivante, sessions ouvertes comprises. Les agents verront les
                dossiers des habilitations gagnées.
              </p>
              <ul className="fr-mt-1v">
                <GainsAgents structure={cible} gains={effet.gainsAgentsCible} />
                <GainsAgents structure={source} gains={effet.gainsAgentsSource} />
              </ul>
            </div>
          )}
        </>
      )}
    </ModaleStructure>
  );
}
