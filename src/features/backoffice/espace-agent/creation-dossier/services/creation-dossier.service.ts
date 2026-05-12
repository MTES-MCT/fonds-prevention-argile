import { userRepo, parcoursRepo, agentsRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { EligibilityService } from "@/features/simulateur/domain/services/eligibility.service";
import { generateSecureRandomString } from "@/features/auth/utils/oauth.utils";
import { getServerEnv } from "@/shared/config/env.config";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";
import {
  type AdresseBienDetails,
  type CreateDossierByAgentParams,
  type CreateDossierByAgentResult,
  CLAIM_TOKEN_TTL_MS,
} from "../domain/types";
import { getInviterName } from "./inviter-name.service";

/**
 * Construit des données de simulation minimales à partir d'une adresse saisie
 * par un agent, en l'absence de simulation complète (parcours sans simulation).
 *
 * Si `details` (BAN) est fourni, on remplit `code_departement`, `commune`,
 * `epci`, etc. pour que `matchesTerritoire` puisse rattacher le dossier au
 * territoire de l'AV. Sans `details`, seul le label est stocké et le dossier
 * sera invisible des AV avec filtre territorial.
 *
 * Le cast vers RGASimulationData est volontaire : la colonne JSONB tolère un
 * objet partiel, et les lecteurs downstream (matchesTerritoire, InfoLogement)
 * utilisent de l'optional chaining.
 */
function buildMinimalAgentSimulation(adresseBien: string, details?: AdresseBienDetails): RGASimulationData {
  const logement: Record<string, unknown> = { adresse: adresseBien };
  if (details) {
    logement.clef_ban = details.clefBan;
    logement.commune = details.codeCommune;
    logement.commune_nom = details.nomCommune;
    logement.code_departement = details.codeDepartement;
    logement.code_region = details.codeRegion;
    if (details.codeEpci) logement.epci = details.codeEpci;
    logement.coordonnees = `${details.coordinates.lat},${details.coordinates.lon}`;
  }
  return {
    logement,
    simulatedAt: new Date().toISOString(),
  } as unknown as RGASimulationData;
}

/**
 * Crée un dossier pour un demandeur à la place d'un agent (AMO ou Aller-vers).
 *
 * Le dossier est rattaché à un user "stub" (sans fcId) et à un claim token
 * unique permettant au demandeur de le récupérer en se connectant via FC.
 */
export async function createDossierByAgent(
  params: CreateDossierByAgentParams
): Promise<CreateDossierByAgentResult> {
  const { agentId, demandeur, adresseBien, adresseBienDetails, rgaSimulationDataAgent, sendEmail } = params;

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

  // 4. Pré-remplissage optionnel des données simulation côté agent
  //    - Simulation complète fournie → on stocke tel quel
  //    - Adresse seule fournie (parcours 1) → simulation minimale
  //    - Rien → pas d'écriture (le demandeur remplira son logement complet
  //      via le simulateur ; cas typique parcours 2 où l'adresse est dans la sim)
  const simulationData =
    rgaSimulationDataAgent ?? (adresseBien ? buildMinimalAgentSimulation(adresseBien, adresseBienDetails) : null);
  if (simulationData) {
    await parcoursRepo.updateRGADataAgent(parcours.id, simulationData, agentId);
  }

  // 4 bis. Si l'agent est rattaché à une entreprise AMO (rôles AMO ou
  // AMO_ET_ALLERS_VERS), on auto-crée une `parcours_amo_validations` qui
  // claim le dossier sur cette entreprise AMO. Le statut dépend de ce qu'a
  // fait l'AMO :
  //
  //   - Simulation complète fournie → l'AMO a déjà vérifié l'éligibilité.
  //     On évalue via `EligibilityService.evaluate` :
  //       - éligible     → LOGEMENT_ELIGIBLE + valideeAt = now (dossier suivi)
  //       - non éligible → LOGEMENT_NON_ELIGIBLE + valideeAt = now (archivé)
  //   - Pas de simulation → EN_ATTENTE (l'AMO attend que le demandeur fasse
  //     sa propre simulation après le claim FC).
  //
  // Idempotent via ON CONFLICT (parcours_id) — utile pour les re-créations.
  const agent = await agentsRepo.findById(agentId);
  if (agent?.entrepriseAmoId) {
    const fullName = `${demandeur.prenom} ${demandeur.nom}`.trim();
    const adresseLogement =
      adresseBien ??
      (rgaSimulationDataAgent?.logement?.adresse as string | undefined) ??
      "";

    let statut: StatutValidationAmo = StatutValidationAmo.EN_ATTENTE;
    let valideeAt: Date | null = null;
    let commentaire = `Invitation créée par ${fullName ? fullName + " — " : ""}agent AMO`;

    if (rgaSimulationDataAgent) {
      const { result } = EligibilityService.evaluate(rgaSimulationDataAgent);
      if (result?.eligible === true) {
        statut = StatutValidationAmo.LOGEMENT_ELIGIBLE;
        valideeAt = new Date();
        commentaire += " (simulation éligible)";
      } else if (result?.eligible === false) {
        statut = StatutValidationAmo.LOGEMENT_NON_ELIGIBLE;
        valideeAt = new Date();
        commentaire += " (simulation non éligible)";
      }
      // Si result est null (sim incomplète improbable ici) → on garde EN_ATTENTE.
    }

    await db
      .insert(parcoursAmoValidations)
      .values({
        parcoursId: parcours.id,
        entrepriseAmoId: agent.entrepriseAmoId,
        statut,
        attributionMode: AttributionAmoMode.MANUEL,
        userPrenom: demandeur.prenom,
        userNom: demandeur.nom,
        userEmail: demandeur.email,
        userTelephone: demandeur.telephone ?? "",
        adresseLogement,
        commentaire,
        valideeAt,
      })
      .onConflictDoNothing({ target: parcoursAmoValidations.parcoursId });
  }

  // 5. Envoi optionnel du mail d'invitation
  const baseUrl = getServerEnv().BASE_URL;
  const claimUrl = `${baseUrl}/claim-dossier/${claimToken}`;
  let emailSent = false;

  if (sendEmail) {
    const inviterName = await getInviterName(agentId);
    const emailResult = await sendClaimDossierEmail({
      demandeurEmail: demandeur.email,
      demandeurPrenomNom: `${demandeur.prenom} ${demandeur.nom}`.trim(),
      inviterName,
      claimUrl,
      hasSimulation: !!rgaSimulationDataAgent,
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
