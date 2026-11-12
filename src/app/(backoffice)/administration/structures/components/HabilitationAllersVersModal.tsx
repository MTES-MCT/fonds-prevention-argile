"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { HabilitationAllersVersFiche } from "@/features/backoffice";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./modales-dsfr";
import ChampsAllersVers, {
  allersVersDepuis,
  allersVersRempli,
  versSaisieAllersVers,
  type AllersVersFormulaire,
  type SaisieAllersVers,
} from "./formulaires/ChampsAllersVers";

interface HabilitationAllersVersModalProps {
  modalId: string;
  // Absente à l'ajout de l'habilitation.
  allersVers: HabilitationAllersVersFiche | null;
  // Change à chaque ouverture, pour repartir des valeurs enregistrées.
  versionOuverture: number;
  effetSurAgents?: ReactNode;
  onConfirm: (saisie: SaisieAllersVers) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

export default function HabilitationAllersVersModal({
  modalId,
  allersVers,
  versionOuverture,
  effetSurAgents,
  onConfirm,
  erreur = null,
  isLoading = false,
}: HabilitationAllersVersModalProps) {
  const [formulaire, setFormulaire] = useState<AllersVersFormulaire>(() => allersVersDepuis(allersVers));

  useEffect(() => {
    setFormulaire(allersVersDepuis(allersVers));
  }, [allersVers, versionOuverture]);

  const handleConfirm = async () => {
    if (await onConfirm(versSaisieAllersVers(formulaire))) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={allersVers ? "Modifier l'habilitation Aller-vers" : "Ajouter l'habilitation Aller-vers"}
      erreur={erreur}
      libelleConfirmation={allersVers ? "Enregistrer" : "Ajouter l'habilitation"}
      libelleEnCours="Enregistrement..."
      confirmationPossible={allersVersRempli(formulaire)}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      <ChampsAllersVers idPrefix={modalId} valeur={formulaire} onChange={setFormulaire} isLoading={isLoading} />
      {effetSurAgents}
    </ModaleStructure>
  );
}
