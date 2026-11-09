"use client";

import { habilitationsDeFiche, LIBELLES_HABILITATION, refusRetrait, type FicheStructure } from "@/features/backoffice";
import EffetSurAgents from "./EffetSurAgents";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./fermer-modale";

interface RetraitHabilitationModalProps {
  modalId: string;
  fiche: FicheStructure | null;
  type: "amo" | "allersVers" | null;
  onConfirm: (type: "amo" | "allersVers") => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

// Même refus que le serveur : une AMO qui suit des dossiers garde son habilitation.
function refusDossiers(fiche: FicheStructure, type: "amo" | "allersVers"): string | null {
  const dossiers = type === "amo" ? (fiche.amo?.dossiersSuivis ?? 0) : 0;
  return dossiers > 0 ? `Cette AMO suit ${dossiers} dossier(s) : son habilitation ne peut pas être retirée` : null;
}

export default function RetraitHabilitationModal({
  modalId,
  fiche,
  type,
  onConfirm,
  erreur = null,
  isLoading = false,
}: RetraitHabilitationModalProps) {
  const habilitations = fiche ? habilitationsDeFiche(fiche) : null;
  const refus =
    fiche && habilitations && type
      ? (refusRetrait(habilitations, type, fiche.nombreAgents) ?? refusDossiers(fiche, type))
      : null;

  const handleConfirm = async () => {
    if (type && (await onConfirm(type))) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre={type ? `Retirer l'habilitation ${LIBELLES_HABILITATION[type]}` : "Retirer une habilitation"}
      erreur={erreur}
      libelleConfirmation="Retirer"
      libelleEnCours="Retrait..."
      confirmationPossible={!!type && !refus}
      onConfirm={handleConfirm}
      isLoading={isLoading}>
      {fiche && habilitations && type && (
        <>
          <p>
            « {fiche.identite.nom} » perd son habilitation {LIBELLES_HABILITATION[type]}, avec son territoire et ses
            emails d&apos;équipe.
          </p>
          {refus ? (
            <div className="fr-alert fr-alert--error fr-alert--sm">
              <p>{refus}</p>
            </div>
          ) : (
            <EffetSurAgents
              habilitations={habilitations}
              type={type}
              operation="retrait"
              nombreAgents={fiche.nombreAgents}
              agents={fiche.agents}
            />
          )}
        </>
      )}
    </ModaleStructure>
  );
}
