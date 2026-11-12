"use client";

import { LIBELLES_HABILITATION, type TypeHabilitation } from "@/features/backoffice";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./modales-dsfr";

interface SuppressionStructureModalProps {
  modalId: string;
  nom: string | null;
  habilitations: TypeHabilitation[];
  onConfirm: () => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

function nommerHabilitations(habilitations: TypeHabilitation[]): string {
  const libelles = habilitations.map((type) => LIBELLES_HABILITATION[type]);
  if (libelles.length === 0) return "";
  const liste = libelles.length > 1 ? `${libelles.slice(0, -1).join(", ")} et ${libelles.at(-1)}` : libelles[0];
  return libelles.length > 1 ? `ses habilitations ${liste}` : `son habilitation ${liste}`;
}

export default function SuppressionStructureModal({
  modalId,
  nom,
  habilitations,
  onConfirm,
  erreur = null,
  isLoading = false,
}: SuppressionStructureModalProps) {
  const handleConfirm = async () => {
    if (await onConfirm()) fermerModale(modalId);
  };
  const avec = nommerHabilitations(habilitations);

  return (
    <ModaleStructure
      modalId={modalId}
      titre="Supprimer la structure"
      erreur={erreur}
      libelleConfirmation="Supprimer"
      libelleEnCours="Suppression..."
      confirmationPossible={!!nom}
      onConfirm={handleConfirm}
      isLoading={isLoading}>
      {nom && (
        <p>
          « {nom} » sera supprimée définitivement{avec ? `, avec ${avec}` : ""}. Elle n&apos;a ni agent ni dossier suivi
          : rien d&apos;autre ne change.
        </p>
      )}
    </ModaleStructure>
  );
}
