"use client";

import { useEffect, useState } from "react";
import type { ExpertGestion } from "@/features/backoffice";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./modales-dsfr";
import ChampsExpert, { expertDepuis, expertRempli, type ExpertFormulaire } from "./formulaires/ChampsExpert";

interface ExpertFormModalProps {
  modalId: string;
  // Absent à l'ajout de l'habilitation.
  expert: ExpertGestion | null;
  // Change à chaque ouverture, pour repartir des valeurs enregistrées.
  versionOuverture: number;
  onConfirm: (formulaire: ExpertFormulaire) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

export default function ExpertFormModal({
  modalId,
  expert,
  versionOuverture,
  onConfirm,
  erreur = null,
  isLoading = false,
}: ExpertFormModalProps) {
  const [formulaire, setFormulaire] = useState<ExpertFormulaire>(() => expertDepuis(expert));

  useEffect(() => {
    setFormulaire(expertDepuis(expert));
  }, [expert, versionOuverture]);

  const handleConfirm = async () => {
    if (await onConfirm(formulaire)) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={expert ? "Modifier l'habilitation Expert" : "Ajouter l'habilitation Expert"}
      erreur={erreur}
      libelleConfirmation="Enregistrer"
      libelleEnCours="Enregistrement..."
      confirmationPossible={expertRempli(formulaire)}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      <ChampsExpert idPrefix={modalId} valeur={formulaire} onChange={setFormulaire} isLoading={isLoading} />
    </ModaleStructure>
  );
}
