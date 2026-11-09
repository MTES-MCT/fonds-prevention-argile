"use client";

import { useEffect, useState } from "react";
import type { ExpertGestion } from "@/features/backoffice";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./fermer-modale";

interface ExpertDesactiverModalProps {
  modalId: string;
  expert: ExpertGestion | null;
  onConfirm: (raison: string) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

export default function ExpertDesactiverModal({
  modalId,
  expert,
  onConfirm,
  erreur = null,
  isLoading = false,
}: ExpertDesactiverModalProps) {
  const [raison, setRaison] = useState("");

  useEffect(() => {
    setRaison("");
  }, [expert]);

  const handleConfirm = async () => {
    if (await onConfirm(raison)) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={expert ? `Désactiver « ${expert.nom} »` : "Désactiver un expert"}
      erreur={erreur}
      libelleConfirmation="Désactiver"
      libelleEnCours="Désactivation..."
      confirmationPossible={!!expert && raison.trim() !== ""}
      onConfirm={handleConfirm}
      isLoading={isLoading}>
      <p className="text-sm text-(--text-mention-grey)">
        L&apos;expert disparaît de l&apos;annuaire des agents et du détail des dossiers. Son habilitation reste sur la
        fiche de la structure, avec la date et le motif, et peut être réactivée.
      </p>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${modalId}-raison`}>
          Motif
        </label>
        <textarea
          className="fr-input"
          id={`${modalId}-raison`}
          rows={3}
          value={raison}
          maxLength={500}
          onChange={(e) => setRaison(e.target.value)}
          disabled={isLoading}
        />
      </div>
    </ModaleStructure>
  );
}
