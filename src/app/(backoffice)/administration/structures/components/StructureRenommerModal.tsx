"use client";

import { useEffect, useState } from "react";
import type { StructureAdministration } from "@/features/backoffice";
import { fermerModale } from "./fermer-modale";
import ModaleStructure from "./ModaleStructure";

interface StructureRenommerModalProps {
  modalId: string;
  structure: StructureAdministration | null;
  onConfirm: (nom: string) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

export default function StructureRenommerModal({
  modalId,
  structure,
  onConfirm,
  erreur = null,
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
    <ModaleStructure
      modalId={modalId}
      titre="Renommer la structure"
      erreur={erreur}
      libelleConfirmation="Renommer"
      libelleEnCours="Enregistrement..."
      confirmationPossible={!!structure && nom.trim() !== "" && nom.trim() !== structure.nom}
      onConfirm={handleConfirm}
      isLoading={isLoading}>
      <p className="text-sm text-(--text-mention-grey)">
        Le nom de la structure ne sert qu&apos;à l&apos;administration. Les noms de ses lignes AMO et Aller-vers,
        affichés aux demandeurs, ne changent pas.
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
    </ModaleStructure>
  );
}
