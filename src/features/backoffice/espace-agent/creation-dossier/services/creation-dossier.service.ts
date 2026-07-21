import { userRepo, parcoursRepo, agentsRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { mapEligibilityReasonToRaisonIneligibilite } from "@/features/simulateur/domain/utils/eligibility-reason-to-raison.utils";
import {
  evaluateAgentSimulation,
  buildEligibiliteArchiveNote,
} from "@/features/backoffice/espace-agent/shared/services/eligibilite-agent.service";
import { generateSecureRandomString } from "@/features/auth/utils/oauth.utils";
import { getServerEnv } from "@/shared/config/env.config";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";
import { qualificationService } from "@/features/backoffice/espace-agent/prospects/services/qualification.service";
import { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
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
export async function createDossierByAgent(params: CreateDossierByAgentParams): Promise<CreateDossierByAgentResult> {
  const {
    agentId,
    demandeur,
    adresseBien,
    adresseBienDetails,
    rgaSimulationDataAgent,
    sendEmail,
    intent = "amo",
  } = params;

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

  // 4 bis. Évaluation d'éligibilité une fois, utilisée par les branches en aval
  //         (claim AMO + auto-archivage non éligible). Helper partagé avec
  //         `updateSimulationDataAction` pour ne pas diverger.
  const { result: eligibilityResult, isEligible, isNonEligible } = evaluateAgentSimulation(rgaSimulationDataAgent);

  // 4 ter. Claim AMO auto, **uniquement en mode `amo`** (entrée /dossiers).
  // En mode `av` (entrée /prospects), même si l'agent a un `entrepriseAmoId`
  // (cas AMO_ET_ALLERS_VERS), on ne claim PAS sur cette entreprise — le
  // dossier reste un prospect côté AV, exactement comme un AV pur.
  //
  // Idempotent via ON CONFLICT (parcours_id).
  const agent = await agentsRepo.findById(agentId);
  const shouldClaimAmo = !!agent?.entrepriseAmoId && intent === "amo";
  if (shouldClaimAmo && agent?.entrepriseAmoId) {
    const fullName = `${demandeur.prenom} ${demandeur.nom}`.trim();
    const adresseLogement = adresseBien ?? (rgaSimulationDataAgent?.logement?.adresse as string | undefined) ?? "";

    let statut: StatutValidationAmo = StatutValidationAmo.EN_ATTENTE;
    let valideeAt: Date | null = null;
    let commentaire = `Invitation créée par ${fullName ? fullName + " — " : ""}agent AMO`;

    if (isEligible) {
      statut = StatutValidationAmo.LOGEMENT_ELIGIBLE;
      valideeAt = new Date();
      commentaire += " (simulation éligible)";
    } else if (isNonEligible) {
      statut = StatutValidationAmo.LOGEMENT_NON_ELIGIBLE;
      valideeAt = new Date();
      commentaire += " (simulation non éligible)";
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

  // 4 quater. Auto-archivage si la simulation est non éligible.
  // - mode `av` : crée une `prospect_qualifications` qui archive le parcours.
  // - mode `amo` : la validation NON_ELIGIBLE est déjà posée plus haut ; il reste
  //   à archiver explicitement le parcours pour que `archivedAt` soit set (sinon
  //   le dashboard admin qui filtre dessus ne voit pas le dossier comme archivé).
  if (isNonEligible) {
    // Note avec le libellé exact de la raison pour que l'agent voie pourquoi le
    // dossier a été archivé (le tag `raisonsIneligibilite` peut retomber sur
    // "autre" pour certaines raisons sans mapping direct, ex. DEMANDE_CATNAT_EN_COURS).
    const archiveNote = buildEligibiliteArchiveNote(eligibilityResult, "creation");

    if (intent === "av") {
      await qualificationService.qualifyProspect({
        parcoursId: parcours.id,
        agentId,
        decision: QualificationDecision.NON_ELIGIBLE,
        actionsRealisees: [],
        raisonsIneligibilite: [mapEligibilityReasonToRaisonIneligibilite(eligibilityResult?.reason)],
        note: archiveNote,
      });
    } else {
      await parcoursRepo.updateSituationParticulier(parcours.id, SituationParticulier.ARCHIVE, archiveNote, agentId);
    }
  }

  // 5. Envoi optionnel du mail d'invitation.
  // On skip le mail si la simulation a déterminé que le demandeur est non
  // éligible — pas de sens de l'inviter à créer un compte sur un dossier
  // déjà archivé.
  const baseUrl = getServerEnv().BASE_URL;
  const claimUrl = `${baseUrl}/claim-dossier/${claimToken}`;
  let emailSent = false;

  if (sendEmail && !isNonEligible) {
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
