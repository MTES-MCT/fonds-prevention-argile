import { userRepo, parcoursRepo } from "@/shared/database/repositories";
import { getServerEnv } from "@/shared/config/env.config";
import { generateSecureRandomString } from "@/features/auth/utils/oauth.utils";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";
import { CLAIM_TOKEN_TTL_MS } from "../domain/types";
import { getInviterName } from "./inviter-name.service";

interface RenvoyerInvitationResult {
  success: boolean;
  emailSent?: boolean;
  error?: string;
}

/**
 * Renvoie l'email d'invitation "claim dossier" au demandeur d'un dossier
 * pré-créé par un agent et non encore réclamé via FranceConnect.
 *
 * Réutilise le token existant s'il est encore valide, sinon en régénère un.
 * NE contient AUCUN contrôle d'accès : l'appelant (server action) doit garder
 * le territoire / rôle avant d'appeler.
 */
export async function renvoyerInvitationClaim(params: {
  parcoursId: string;
  agentId: string;
}): Promise<RenvoyerInvitationResult> {
  const { parcoursId, agentId } = params;

  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) return { success: false, error: "Dossier introuvable" };
  if (!parcours.createdByAgentId) {
    return { success: false, error: "Ce dossier n'a pas été créé par un agent : aucune invitation à renvoyer." };
  }
  if (parcours.archivedAt) {
    return { success: false, error: "Dossier archivé : renvoi impossible." };
  }

  const user = await userRepo.findById(parcours.userId);
  if (!user) return { success: false, error: "Demandeur introuvable" };
  if (user.fcId || user.claimedAt) {
    return { success: false, error: "Le demandeur a déjà réclamé son dossier." };
  }
  if (!user.email) {
    return { success: false, error: "Aucune adresse email enregistrée pour ce demandeur." };
  }

  // Réutilise le token tant qu'il est valide ; sinon en régénère un (TTL frais).
  const tokenValide =
    !!user.claimToken && !!user.claimTokenExpiresAt && user.claimTokenExpiresAt.getTime() > Date.now();
  let token = user.claimToken ?? "";
  if (!tokenValide) {
    token = generateSecureRandomString(48);
    await userRepo.setClaimToken(user.id, token, new Date(Date.now() + CLAIM_TOKEN_TTL_MS));
  }

  const claimUrl = `${getServerEnv().BASE_URL}/claim-dossier/${token}`;
  const inviterName = await getInviterName(agentId);
  const hasSimulation = parcours.rgaSimulationData !== null || parcours.rgaSimulationDataAgent !== null;

  const emailResult = await sendClaimDossierEmail({
    demandeurEmail: user.email,
    demandeurPrenomNom: `${user.prenom ?? ""} ${user.nom ?? ""}`.trim(),
    inviterName,
    claimUrl,
    hasSimulation,
  });

  if (!emailResult.success) {
    return { success: false, error: emailResult.error || "Échec de l'envoi de l'email" };
  }

  return { success: true, emailSent: true };
}
