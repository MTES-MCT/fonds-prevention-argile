import { eq, and, or, like } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  amoValidationTokens,
  entreprisesAmo,
  entreprisesAmoCommunes,
  entreprisesAmoEpci,
  parcoursAmoValidations,
  users,
} from "@/shared/database/schema";
import { parcoursRepo } from "@/shared/database/repositories";
import { ActionResult } from "@/shared/types/action-result.types";
import { AMO_VALIDATION_TOKEN_VALIDITY_DAYS, StatutValidationAmo } from "../domain/value-objects";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { AmoMode, getAmoMode } from "../domain/value-objects/departements-amo";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { Status, Step } from "../../core";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../utils/amo.utils";

/**
 * Paramètres pour la sélection d'un AMO
 */
export interface SelectAmoParams {
  entrepriseAmoId: string;
  userPrenom: string;
  userNom: string;
  userEmail: string;
  userTelephone: string;
  adresseLogement: string;
}

/**
 * Résultat de la sélection d'un AMO
 */
export interface SelectAmoResult {
  message: string;
  token: string;
}

/**
 * Valide les données personnelles requises
 */
function validatePersonalData(params: SelectAmoParams): string | null {
  if (!params.userPrenom?.trim()) {
    return "Le prénom est requis";
  }
  if (!params.userNom?.trim()) {
    return "Le nom est requis";
  }
  if (!params.adresseLogement?.trim()) {
    return "L'adresse du logement est requise";
  }
  if (!params.userEmail?.trim()) {
    return "L'email est requis";
  }
  if (!params.userTelephone?.trim()) {
    return "Le téléphone est requis";
  }
  return null;
}

/**
 * Vérifie que l'AMO couvre le territoire (EPCI > INSEE > Département)
 */
async function checkAmoCoversTerritory(
  entrepriseAmoId: string,
  codeInsee: string,
  codeEpci: string | null
): Promise<boolean> {
  const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);

  const amoValide = await db
    .select({ id: entreprisesAmo.id })
    .from(entreprisesAmo)
    .leftJoin(entreprisesAmoEpci, eq(entreprisesAmo.id, entreprisesAmoEpci.entrepriseAmoId))
    .leftJoin(entreprisesAmoCommunes, eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId))
    .where(
      and(
        eq(entreprisesAmo.id, entrepriseAmoId),
        or(
          codeEpci ? eq(entreprisesAmoEpci.codeEpci, codeEpci) : undefined,
          eq(entreprisesAmoCommunes.codeInsee, codeInsee),
          like(entreprisesAmo.departements, `%${codeDepartement}%`)
        )
      )
    )
    .limit(1);

  return amoValide.length > 0;
}

/**
 * Sélectionne un AMO pour un utilisateur
 * - Vérifie le parcours et l'étape
 * - Vérifie la couverture territoriale
 * - Crée la validation AMO
 * - Génère le token
 * - Envoie l'email à l'AMO
 * - Stocke le brevoMessageId pour le tracking
 *
 * @param attributionMode mode d'attribution de l'AMO (MANUEL par défaut, AUTO_OBLIGATOIRE
 *                        ou AUTO_AV_AMO si appelé depuis l'auto-assignation)
 */
export async function selectAmoForUser(
  userId: string,
  params: SelectAmoParams,
  attributionMode: AttributionAmoMode = AttributionAmoMode.MANUEL
): Promise<ActionResult<SelectAmoResult>> {
  // Validation des données personnelles
  const validationError = validatePersonalData(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { entrepriseAmoId, userPrenom, userNom, userEmail, userTelephone, adresseLogement } = params;

  // Récupérer le parcours de l'utilisateur
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  // Vérifier qu'on est bien à l'étape CHOIX_AMO
  if (parcours.currentStep !== Step.CHOIX_AMO) {
    return {
      success: false,
      error: "Vous n'êtes pas à l'étape de choix de l'AMO",
    };
  }

  // Vérifier que le parcours a les données RGA
  if (!parcours.rgaSimulationData?.logement?.commune) {
    return {
      success: false,
      error: "Simulation RGA non complétée (code INSEE manquant)",
    };
  }

  const codeInsee = normalizeCodeInsee(parcours.rgaSimulationData.logement.commune);
  if (!codeInsee) {
    return {
      success: false,
      error: "Simulation RGA non complétée (code INSEE invalide)",
    };
  }

  // Extraire le code EPCI (si disponible)
  const codeEpci = parcours.rgaSimulationData.logement.epci
    ? String(parcours.rgaSimulationData.logement.epci).trim()
    : null;

  // Vérifier que l'AMO couvre le territoire
  const amoCovers = await checkAmoCoversTerritory(entrepriseAmoId, codeInsee, codeEpci);
  if (!amoCovers) {
    return {
      success: false,
      error: "Cette AMO ne couvre pas votre territoire (EPCI, commune ou département)",
    };
  }

  // Mettre à jour l'email de contact et le téléphone de l'utilisateur
  await db
    .update(users)
    .set({
      emailContact: userEmail.trim(),
      telephone: userTelephone.trim(),
    })
    .where(eq(users.id, userId));

  // Créer ou mettre à jour la validation AMO
  // Reset des champs email tracking en cas de re-sélection
  const [validation] = await db
    .insert(parcoursAmoValidations)
    .values({
      parcoursId: parcours.id,
      entrepriseAmoId,
      statut: StatutValidationAmo.EN_ATTENTE,
      attributionMode,
      userPrenom: userPrenom.trim(),
      userNom: userNom.trim(),
      userEmail: userEmail.trim(),
      userTelephone: userTelephone.trim(),
      adresseLogement: adresseLogement.trim(),
    })
    .onConflictDoUpdate({
      target: parcoursAmoValidations.parcoursId,
      set: {
        entrepriseAmoId,
        statut: StatutValidationAmo.EN_ATTENTE,
        attributionMode,
        choisieAt: new Date(),
        valideeAt: null,
        commentaire: null,
        userPrenom: userPrenom.trim(),
        userNom: userNom.trim(),
        userEmail: userEmail.trim(),
        userTelephone: userTelephone.trim(),
        adresseLogement: adresseLogement.trim(),
        // Reset du tracking email (nouvelle tentative)
        brevoMessageId: null,
        emailSentAt: null,
        emailDeliveredAt: null,
        emailOpenedAt: null,
        emailClickedAt: null,
        emailBounceType: null,
        emailBounceReason: null,
      },
    })
    .returning();

  if (!validation) {
    return {
      success: false,
      error: "Erreur lors de la création de la validation",
    };
  }

  // Générer un token unique
  const token = crypto.randomUUID();

  // Calculer la date d'expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AMO_VALIDATION_TOKEN_VALIDITY_DAYS);

  // Créer le token de validation
  await db.insert(amoValidationTokens).values({
    parcoursAmoValidationId: validation.id,
    token,
    expiresAt,
  });

  // Récupérer les infos de l'AMO pour l'email
  const [amo] = await db
    .select({
      nom: entreprisesAmo.nom,
      emails: entreprisesAmo.emails,
    })
    .from(entreprisesAmo)
    .where(eq(entreprisesAmo.id, entrepriseAmoId))
    .limit(1);

  if (!amo) {
    return { success: false, error: "AMO non trouvée" };
  }

  // Envoyer l'email de validation à l'AMO
  const emailsList = amo.emails.split(";").map((e) => e.trim());

  const emailResult = await sendValidationAmoEmail({
    amoEmail: emailsList,
    amoNom: amo.nom,
    demandeurNom: userNom,
    demandeurPrenom: userPrenom,
    demandeurCodeInsee: codeInsee,
    adresseLogement,
    token,
  });

  // Stocker le brevoMessageId si l'envoi a réussi
  if (emailResult.success && emailResult.data?.messageId) {
    await db
      .update(parcoursAmoValidations)
      .set({
        brevoMessageId: emailResult.data.messageId,
        emailSentAt: new Date(),
      })
      .where(eq(parcoursAmoValidations.id, validation.id));
  } else {
    console.error("Erreur envoi email AMO:", !emailResult.success ? emailResult.error : "Message ID manquant");
    // On continue quand même, l'email n'est pas bloquant
  }

  // Passer le parcours en EN_INSTRUCTION
  await parcoursRepo.updateStatus(parcours.id, Status.EN_INSTRUCTION);

  return {
    success: true,
    data: {
      message: "AMO sélectionnée avec succès",
      token,
    },
  };
}

/**
 * Récupère le 1er AMO couvrant le territoire du parcours.
 * Logique EPCI > département (alignée sur `getAmosDisponibles`).
 */
async function findFirstAmoForTerritory(
  codeInsee: string,
  codeEpci: string | null
): Promise<{ id: string } | null> {
  if (codeEpci) {
    const [amoEpci] = await db
      .select({ id: entreprisesAmo.id })
      .from(entreprisesAmo)
      .innerJoin(entreprisesAmoEpci, eq(entreprisesAmo.id, entreprisesAmoEpci.entrepriseAmoId))
      .where(eq(entreprisesAmoEpci.codeEpci, codeEpci))
      .limit(1);
    if (amoEpci) return amoEpci;
  }

  const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);
  const [amoDept] = await db
    .select({ id: entreprisesAmo.id })
    .from(entreprisesAmo)
    .where(like(entreprisesAmo.departements, `%${codeDepartement}%`))
    .limit(1);

  return amoDept ?? null;
}

/**
 * Auto-affecte un AMO au parcours d'un utilisateur (modes OBLIGATOIRE et AV_AMO_FUSIONNES).
 *
 * Idempotent : si une validation existe déjà pour ce parcours, ne fait rien.
 *
 * Récupère :
 * - le département du demandeur depuis rgaSimulationData
 * - le 1er AMO couvrant le territoire (EPCI > département)
 * - l'email/téléphone de contact depuis users (sinon firstName/lastName fallback)
 * Délègue ensuite à `selectAmoForUser` avec le mode d'attribution adéquat.
 */
export async function assignAmoAutomatiqueForUser(userId: string): Promise<ActionResult<SelectAmoResult>> {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  if (parcours.currentStep !== Step.CHOIX_AMO) {
    return { success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" };
  }

  // Idempotence : une validation existe déjà → no-op
  const [existing] = await db
    .select({ id: parcoursAmoValidations.id })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
    .limit(1);
  if (existing) {
    return { success: true, data: { message: "AMO déjà attribuée", token: "" } };
  }

  const codeInsee = normalizeCodeInsee(parcours.rgaSimulationData?.logement?.commune);
  if (!codeInsee) {
    return { success: false, error: "Simulation RGA non complétée (code INSEE invalide)" };
  }

  const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);
  const mode = getAmoMode(codeDepartement);

  // L'auto-attribution ne s'applique qu'aux modes OBLIGATOIRE et AV_AMO_FUSIONNES
  let attributionMode: AttributionAmoMode;
  if (mode === AmoMode.OBLIGATOIRE) {
    attributionMode = AttributionAmoMode.AUTO_OBLIGATOIRE;
  } else if (mode === AmoMode.AV_AMO_FUSIONNES) {
    attributionMode = AttributionAmoMode.AUTO_AV_AMO;
  } else {
    return { success: false, error: "Le département du demandeur n'impose pas d'AMO automatique" };
  }

  const codeEpci = parcours.rgaSimulationData?.logement?.epci
    ? String(parcours.rgaSimulationData.logement.epci).trim()
    : null;

  const amo = await findFirstAmoForTerritory(codeInsee, codeEpci);
  if (!amo) {
    return { success: false, error: "Aucun AMO disponible pour le territoire du demandeur" };
  }

  // Récupérer les coordonnées de contact du demandeur
  const [user] = await db
    .select({
      prenom: users.prenom,
      nom: users.nom,
      email: users.email,
      emailContact: users.emailContact,
      telephone: users.telephone,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { success: false, error: "Utilisateur non trouvé" };
  }

  if (!user.prenom || !user.nom) {
    return { success: false, error: "Coordonnées du demandeur incomplètes (prénom/nom)" };
  }
  const userEmail = user.emailContact ?? user.email;
  if (!userEmail) {
    return { success: false, error: "Coordonnées du demandeur incomplètes (email)" };
  }
  if (!user.telephone) {
    return { success: false, error: "Coordonnées du demandeur incomplètes (téléphone)" };
  }

  const adresseLogement = parcours.rgaSimulationData?.logement?.adresse;
  if (!adresseLogement) {
    return { success: false, error: "Adresse du logement manquante dans la simulation RGA" };
  }

  return selectAmoForUser(
    userId,
    {
      entrepriseAmoId: amo.id,
      userPrenom: user.prenom,
      userNom: user.nom,
      userEmail,
      userTelephone: user.telephone,
      adresseLogement,
    },
    attributionMode
  );
}

/**
 * Renonce explicitement à un AMO (mode FACULTATIF) et fait avancer le parcours
 * directement à l'étape ELIGIBILITE.
 *
 * Crée une `parcours_amo_validations` avec :
 *   - statut = SANS_AMO
 *   - attributionMode = AUCUN
 *   - entrepriseAmoId = null
 */
export async function skipAmoStepForUser(userId: string): Promise<ActionResult<{ message: string }>> {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  if (parcours.currentStep !== Step.CHOIX_AMO || parcours.currentStatus !== Status.TODO) {
    return { success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" };
  }

  const codeInsee = normalizeCodeInsee(parcours.rgaSimulationData?.logement?.commune);
  if (!codeInsee) {
    return { success: false, error: "Simulation RGA non complétée (code INSEE invalide)" };
  }

  const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);
  if (getAmoMode(codeDepartement) !== AmoMode.FACULTATIF) {
    return { success: false, error: "L'AMO est obligatoire pour ce département" };
  }

  await db
    .insert(parcoursAmoValidations)
    .values({
      parcoursId: parcours.id,
      entrepriseAmoId: null,
      statut: StatutValidationAmo.SANS_AMO,
      attributionMode: AttributionAmoMode.AUCUN,
    })
    .onConflictDoUpdate({
      target: parcoursAmoValidations.parcoursId,
      set: {
        entrepriseAmoId: null,
        statut: StatutValidationAmo.SANS_AMO,
        attributionMode: AttributionAmoMode.AUCUN,
        choisieAt: new Date(),
        valideeAt: null,
        commentaire: null,
        brevoMessageId: null,
        emailSentAt: null,
        emailDeliveredAt: null,
        emailOpenedAt: null,
        emailClickedAt: null,
        emailBounceType: null,
        emailBounceReason: null,
      },
    });

  await parcoursRepo.updateStep(parcours.id, Step.ELIGIBILITE, Status.TODO);

  return {
    success: true,
    data: { message: "Parcours avancé à l'étape éligibilité sans AMO" },
  };
}
