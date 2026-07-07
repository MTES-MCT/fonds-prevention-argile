import { checkParticulierAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseParticulier } from "@/shared/components";
import MonCompteClient from "@/features/parcours/core/components/MonCompteClient";
import { redirect } from "next/navigation";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { getPiecesJustificativesByStep } from "@/features/parcours/dossiers-ds/services/pieces-justificatives.service";

// Étapes à venir dont on pré-charge les pièces (source DN, en cache). Le currentStep
// n'est connu que côté client : on fournit toutes les étapes, chaque carte prend la sienne.
const STEPS_AVEC_PIECES = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

export default async function MonComptePage() {
  const access = await checkParticulierAccess();

  // Si pas connecté du tout → redirect vers connexion
  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.particulier);
  }

  // Si connecté mais mauvais rôle, pas d'accès et message d'erreur
  if (!access.hasAccess) {
    return <AccesNonAutoriseParticulier />;
  }

  // Utilisateur valide
  const piecesByStep = await getPiecesJustificativesByStep(STEPS_AVEC_PIECES);
  return <MonCompteClient piecesByStep={piecesByStep} />;
}
