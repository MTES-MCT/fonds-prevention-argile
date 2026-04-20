import { userRepo, parcoursRepo } from "@/shared/database/repositories";
import { generateSecureRandomString } from "@/features/auth/utils/oauth.utils";
import { getServerEnv } from "@/shared/config/env.config";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";
import {
  type CreateDossierByAgentParams,
  type CreateDossierByAgentResult,
  CLAIM_TOKEN_TTL_MS,
} from "../domain/types";

/**
 * Construit des données de simulation minimales à partir d'une adresse saisie
 * par un agent, en l'absence de simulation complète (parcours 1).
 *
 * Le cast vers RGASimulationData est volontaire : la colonne JSONB tolère
 * un objet partiel, et les lecteurs downstream (matchesTerritoire, InfoLogement)
 * utilisent de l'optional chaining.
 */
function buildMinimalAgentSimulation(adresseBien: string): RGASimulationData {
  return {
    logement: {
      adresse: adresseBien,
    },
    simulatedAt: new Date().toISOString(),
  } as unknown as RGASimulationData;
}

/**
 * Crée un dossier pour un demandeur à la place d'un agent Aller-vers.
 *
 * Le dossier est rattaché à un user "stub" (sans fcId) et à un claim token
 * unique permettant au demandeur de le récupérer en se connectant via FC.
 */
export async function createDossierByAgent(
  params: CreateDossierByAgentParams
): Promise<CreateDossierByAgentResult> {
  const { agentId, demandeur, adresseBien, rgaSimulationDataAgent, sendEmail } = params;

  // 1. Génération du claim token (+ expiration)
  const claimToken = generateSecureRandomString(48);
  const claimTokenExpiresAt = new Date(Date.now() + CLAIM_TOKEN_TTL_MS);

  // 2. Création du user stub
  const user = await userRepo.createStub({
    nom: demandeur.nom,
    prenom: demandeur.prenom,
    email: demandeur.email,
    telephone: demandeur.telephone,
    claimToken,
    claimTokenExpiresAt,
  });

  // 3. Création du parcours associé (tracé sur l'agent)
  const parcours = await parcoursRepo.findOrCreateForUser(user.id, {
    createdByAgentId: agentId,
  });

  // 4. Pré-remplissage des données simulation côté agent
  //    - Parcours 2 : simulation complète fournie
  //    - Parcours 1 : simulation minimale (adresse seule)
  const simulationData = rgaSimulationDataAgent ?? buildMinimalAgentSimulation(adresseBien);
  await parcoursRepo.updateRGADataAgent(parcours.id, simulationData, agentId);

  // 5. Envoi optionnel du mail d'invitation
  const baseUrl = getServerEnv().BASE_URL;
  const claimUrl = `${baseUrl}/claim-dossier/${claimToken}`;
  let emailSent = false;

  if (sendEmail) {
    const emailResult = await sendClaimDossierEmail({
      demandeurEmail: demandeur.email,
      demandeurPrenom: demandeur.prenom,
      claimUrl,
    });
    emailSent = emailResult.success;
  }

  return {
    userId: user.id,
    parcoursId: parcours.id,
    claimToken,
    claimUrl,
    emailSent,
  };
}
