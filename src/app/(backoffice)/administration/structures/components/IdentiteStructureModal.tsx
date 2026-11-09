"use client";

import { useEffect, useState } from "react";
import type { IdentiteStructure } from "@/features/backoffice";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./modales-dsfr";
import ChampsIdentite, { identiteDepuis, identiteRemplie, type IdentiteFormulaire } from "./formulaires/ChampsIdentite";

interface IdentiteStructureModalProps {
  modalId: string;
  identite: IdentiteStructure | null;
  siretRequis: boolean;
  // Change à chaque ouverture, pour repartir des valeurs enregistrées.
  versionOuverture: number;
  onConfirm: (formulaire: IdentiteFormulaire) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

export default function IdentiteStructureModal({
  modalId,
  identite,
  siretRequis,
  versionOuverture,
  onConfirm,
  erreur = null,
  isLoading = false,
}: IdentiteStructureModalProps) {
  const [formulaire, setFormulaire] = useState<IdentiteFormulaire>(() => identiteDepuis(identite));

  useEffect(() => {
    setFormulaire(identiteDepuis(identite));
  }, [identite, versionOuverture]);

  const handleConfirm = async () => {
    if (await onConfirm(formulaire)) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={identite ? `Modifier « ${identite.nom} »` : "Modifier la structure"}
      erreur={erreur}
      libelleConfirmation="Enregistrer"
      libelleEnCours="Enregistrement..."
      confirmationPossible={identiteRemplie(formulaire, siretRequis)}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      <ChampsIdentite
        idPrefix={modalId}
        valeur={formulaire}
        onChange={setFormulaire}
        siretRequis={siretRequis}
        isLoading={isLoading}
      />
    </ModaleStructure>
  );
}
