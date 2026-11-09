"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { HabilitationAmoFiche } from "@/features/backoffice";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./fermer-modale";
import ChampsAmo, {
  amoDepuis,
  amoRemplie,
  versSaisieAmo,
  type AmoFormulaire,
  type SaisieAmo,
} from "./formulaires/ChampsAmo";

interface HabilitationAmoModalProps {
  modalId: string;
  // Absente à l'ajout de l'habilitation.
  amo: HabilitationAmoFiche | null;
  // Change à chaque ouverture, pour repartir des valeurs enregistrées.
  versionOuverture: number;
  effetSurAgents?: ReactNode;
  onConfirm: (saisie: SaisieAmo) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

export default function HabilitationAmoModal({
  modalId,
  amo,
  versionOuverture,
  effetSurAgents,
  onConfirm,
  erreur = null,
  isLoading = false,
}: HabilitationAmoModalProps) {
  const [formulaire, setFormulaire] = useState<AmoFormulaire>(() => amoDepuis(amo));

  useEffect(() => {
    setFormulaire(amoDepuis(amo));
  }, [amo, versionOuverture]);

  const handleConfirm = async () => {
    if (await onConfirm(versSaisieAmo(formulaire))) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={amo ? "Modifier l'habilitation AMO" : "Ajouter l'habilitation AMO"}
      erreur={erreur}
      libelleConfirmation={amo ? "Enregistrer" : "Ajouter l'habilitation"}
      libelleEnCours="Enregistrement..."
      confirmationPossible={amoRemplie(formulaire)}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      <ChampsAmo idPrefix={modalId} valeur={formulaire} onChange={setFormulaire} isLoading={isLoading} />
      {effetSurAgents}
    </ModaleStructure>
  );
}
