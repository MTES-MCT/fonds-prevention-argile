import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { amoValidationTokens, entreprisesAmo, parcoursAmoValidations, users } from "@/shared/database/schema";
import { parcoursRepo } from "@/shared/database/repositories";
import { ActionResult } from "@/shared/types/action-result.types";
import {
  AMO_VALIDATION_TOKEN_VALIDITY_DAYS,
  StatutValidationAmo,
  peutDemanderAccompagnement,
} from "../domain/value-objects";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { estAmoObligatoire, getReglesAmo } from "../domain/value-objects/departements-amo";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { Status, Step } from "../../core";
import { getDossierByStep } from "../../dossiers-ds/services/dossier-ds.service";
import { reinitialiserDossierEtape } from "../../dossiers-ds/services/regeneration.service";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../utils/amo.utils";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import {
  ERREUR_AUCUNE_AMO,
  ERREUR_CHOIX_AMO_REQUIS,
  resoudreAmo,
  territoireDuParcours,
  type ReglesAmo,
} from "../domain/value-objects";
import { amoCouvreTerritoire, listerAmosDuTerritoire } from "./amo-couverture.service";
import { emitBrevoEvent, BREVO_EVENTS, buildConseillerAttributesFromAmo } from "@/shared/email/brevo";
import type { ParcoursPrevention } from "@/shared/database/schema";

/**
 * Étapes où une AMO peut être sollicitée. `INVITATION` y figure : un dossier créé par un
 * agent y reste jusqu'au claim, et l'AMO doit pouvoir être saisie entre-temps (ADR-0038).
 */
const ETAPES_SELECTION_AMO: readonly Step[] = [Step.CHOIX_AMO, Step.INVITATION];

/**
 * Paramètres pour la sélection d'un AMO
 */
export interface SelectAmoParams {
  entrepriseAmoId: string;
  userPrenom: string;
  userNom: string;
  userEmail: string;
  /** Optionnel : le formulaire demandeur l'exige, pas l'auto-attribution (cf. `assignAmoAutomatiqueForUser`). */
  userTelephone?: string | null;
  adresseLogement: string;
}

/**
 * Résultat de la sélection d'un AMO
 */
export interface SelectAmoResult {
  message: string;
  token: string;
  /** AMO sollicitée, absente quand une validation existait déjà. */
  amoNom?: string;
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
  return null;
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
 * @param options.skipStepGuard ignore la vérification `currentStep === CHOIX_AMO` — utilisé
 *   par `demanderAccompagnementDemandeur`, où le parcours a déjà avancé à ÉLIGIBILITE.
 * @param options.skipStatusUpdate n'écrit pas `parcours.currentStatus = EN_INSTRUCTION` —
 *   idem, l'étape courante n'étant plus CHOIX_AMO, ce champ reste piloté par la sync DS.
 * @param options.nePasEcraser refuse au lieu de remplacer une validation existante — l'auto
 *   -attribution s'en sert pour ne pas défaire une décision posée entre sa lecture et son
 *   écriture (l'upsert, lui, sert la re-sélection volontaire d'un AMO par le demandeur).
 */
export async function selectAmoForUser(
  userId: string,
  params: SelectAmoParams,
  attributionMode: AttributionAmoMode = AttributionAmoMode.MANUEL,
  options?: { skipStepGuard?: boolean; skipStatusUpdate?: boolean; nePasEcraser?: boolean }
): Promise<ActionResult<SelectAmoResult>> {
  // Validation des données personnelles
  const validationError = validatePersonalData(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { entrepriseAmoId, userPrenom, userNom, userEmail, adresseLogement } = params;
  const telephone = params.userTelephone?.trim() || null;

  // Récupérer le parcours de l'utilisateur
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  // Étape attendue : CHOIX_AMO, ou INVITATION quand le dossier a été créé par un agent et
  // n'a pas encore été réclamé — l'AMO doit pouvoir être sollicitée sans attendre le claim.
  if (!options?.skipStepGuard && !ETAPES_SELECTION_AMO.includes(parcours.currentStep)) {
    return {
      success: false,
      error: "Vous n'êtes pas à l'étape de choix de l'AMO",
    };
  }

  // Résolution territoriale user-first (fallback agent) : un dossier créé par un
  // Aller-vers peut n'avoir que rgaSimulationDataAgent tant que le ménage n'a pas simulé.
  const territoire = territoireDuParcours(parcours);
  if (!territoire) {
    return {
      success: false,
      error: "Simulation RGA non complétée (code INSEE manquant ou invalide)",
    };
  }
  const codeInsee = territoire.codeInsee;

  // Seule une AMO proposée pour ce territoire peut être sollicitée, quel que soit l'appelant.
  if (!(await amoCouvreTerritoire(entrepriseAmoId, territoire))) {
    return {
      success: false,
      error: "Cette AMO ne couvre pas votre territoire (commune, EPCI ou département)",
    };
  }

  // Mettre à jour l'email de contact et le téléphone de l'utilisateur.
  // Le téléphone n'est écrit que s'il est fourni : sinon on écraserait un numéro existant.
  await db
    .update(users)
    .set({
      emailContact: userEmail.trim(),
      ...(telephone ? { telephone } : {}),
    })
    .where(eq(users.id, userId));

  // Créer ou mettre à jour la validation AMO
  const valeurs = {
    parcoursId: parcours.id,
    entrepriseAmoId,
    statut: StatutValidationAmo.EN_ATTENTE,
    attributionMode,
    userPrenom: userPrenom.trim(),
    userNom: userNom.trim(),
    userEmail: userEmail.trim(),
    userTelephone: telephone,
    adresseLogement: adresseLogement.trim(),
  };

  const [validation] = options?.nePasEcraser
    ? await db
        .insert(parcoursAmoValidations)
        .values(valeurs)
        .onConflictDoNothing({ target: parcoursAmoValidations.parcoursId })
        .returning()
    : await db
        .insert(parcoursAmoValidations)
        .values(valeurs)
        .onConflictDoUpdate({
          target: parcoursAmoValidations.parcoursId,
          set: {
            ...valeurs,
            choisieAt: new Date(),
            valideeAt: null,
            commentaire: null,
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
    // Sans écrasement, l'absence de ligne signifie qu'une validation a été posée entre
    // la lecture de l'appelant et cette écriture : on la laisse telle quelle.
    if (options?.nePasEcraser) {
      return { success: true, data: { message: "AMO déjà attribuée", token: "" } };
    }
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

  // Récupérer les infos de l'AMO pour l'email (+ téléphone/horaires pour la synchro Brevo)
  const [amo] = await db
    .select({
      nom: entreprisesAmo.nom,
      emails: entreprisesAmo.emails,
      telephone: entreprisesAmo.telephone,
      horaires: entreprisesAmo.horaires,
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

  // Passer le parcours en EN_INSTRUCTION (sauf demande après autonomie, cf. options ci-dessus)
  if (!options?.skipStatusUpdate) {
    await parcoursRepo.updateStatus(parcours.id, Status.EN_INSTRUCTION);
  }

  // Synchro Brevo (flux) : rafraîchit les attributs du conseiller sur le contact — le
  // responsable peut changer en cours de parcours (AV -> AMO ici). Couvre aussi bien
  // la sélection manuelle que l'auto-attribution (assignAmoAutomatiqueForUser délègue ici).
  await emitBrevoEvent(parcours.id, BREVO_EVENTS.AMO_DEFINI, {
    attributes: buildConseillerAttributesFromAmo(amo),
  });

  return {
    success: true,
    data: {
      message: "AMO sélectionnée avec succès",
      token,
      amoNom: amo.nom,
    },
  };
}

/** Qui désigne l'AMO quand plusieurs couvrent le territoire : le demandeur, ou l'Aller-vers pour lui. */
export interface ChoixAmo {
  entrepriseAmoId: string;
  par: "demandeur" | "agent";
}

/**
 * AMO à solliciter et mode d'attribution à tracer. Sans choix explicite, seule l'AMO unique du
 * territoire peut être désignée : entre plusieurs, l'application ne choisit jamais à la place.
 */
async function designerAmo(
  parcours: ParcoursPrevention,
  choix?: ChoixAmo
): Promise<ActionResult<{ entrepriseAmoId: string; attributionMode: AttributionAmoMode }>> {
  const territoire = territoireDuParcours(parcours);
  if (!territoire) {
    return { success: false, error: "Simulation RGA non complétée (code INSEE invalide)" };
  }

  const amos = await listerAmosDuTerritoire(territoire);

  if (choix) {
    if (!amos.some((amo) => amo.id === choix.entrepriseAmoId)) {
      return { success: false, error: "Cette AMO ne couvre pas le territoire du demandeur" };
    }
    const attributionMode = choix.par === "agent" ? AttributionAmoMode.CHOIX_AGENT : AttributionAmoMode.MANUEL;
    return { success: true, data: { entrepriseAmoId: choix.entrepriseAmoId, attributionMode } };
  }

  const resolution = resoudreAmo(amos);
  if (resolution.statut === "aucune") return { success: false, error: ERREUR_AUCUNE_AMO };
  if (resolution.statut === "plusieurs") return { success: false, error: ERREUR_CHOIX_AMO_REQUIS };

  return {
    success: true,
    data: {
      entrepriseAmoId: resolution.amo.id,
      attributionMode: modeAttributionParDefaut(getReglesAmo(getCodeDepartementFromCodeInsee(territoire.codeInsee))),
    },
  };
}

/** Trace pourquoi l'AMO unique a été désignée sans que personne ne la choisisse. */
function modeAttributionParDefaut(regles: ReglesAmo): AttributionAmoMode {
  if (regles.avCumuleAmo) return AttributionAmoMode.AUTO_AV_AMO;
  if (regles.amoObligatoire) return AttributionAmoMode.AUTO_OBLIGATOIRE;
  return AttributionAmoMode.AUTO_UNIQUE;
}

/**
 * Coordonnées du demandeur reprises dans la validation et l'email à l'AMO. Résolution
 * territoriale user-first (fallback agent) : un dossier Aller-vers n'a parfois que la sienne.
 */
async function coordonneesDemandeur(
  userId: string,
  parcours: ParcoursPrevention
): Promise<
  ActionResult<{
    userPrenom: string;
    userNom: string;
    userEmail: string;
    userTelephone: string | null;
    adresseLogement: string;
  }>
> {
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
  // Pas de garde sur le téléphone : il est absent des dossiers créés par un Aller-vers et
  // ne figure pas dans l'email envoyé à l'AMO — l'exiger bloquait l'attribution en silence.
  const adresseLogement = getDemandeurFirstLogement(parcours)?.adresse;
  if (!adresseLogement) {
    return { success: false, error: "Adresse du logement manquante dans la simulation RGA" };
  }

  return {
    success: true,
    data: { userPrenom: user.prenom, userNom: user.nom, userEmail, userTelephone: user.telephone, adresseLogement },
  };
}

/**
 * Attribue l'AMO au parcours d'un utilisateur : l'AMO unique du territoire, ou celle que le
 * demandeur (ou l'Aller-vers pour lui) a choisie quand il y en a plusieurs.
 *
 * Accepte l'étape `INVITATION` : un dossier créé par un agent y reste jusqu'au claim, et
 * l'AMO doit pouvoir être sollicitée sans attendre que le demandeur crée son compte — sans
 * cela, la qualification d'un Aller-vers échouait en silence et le dossier restait chez lui.
 *
 * Idempotent : si une validation existe déjà pour ce parcours, ne fait rien.
 * Délègue ensuite à `selectAmoForUser` avec le mode d'attribution adéquat.
 */
export async function assignAmoAutomatiqueForUser(
  userId: string,
  choix?: ChoixAmo
): Promise<ActionResult<SelectAmoResult>> {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  if (!ETAPES_SELECTION_AMO.includes(parcours.currentStep)) {
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

  const designation = await designerAmo(parcours, choix);
  if (!designation.success) {
    return designation;
  }

  const coordonnees = await coordonneesDemandeur(userId, parcours);
  if (!coordonnees.success) {
    return coordonnees;
  }

  // `skipStatusUpdate` à l'étape invitation : `currentStatus` n'a de sens que rattaché à
  // l'étape courante, et c'est le claim qui posera EN_INSTRUCTION avec CHOIX_AMO.
  return selectAmoForUser(
    userId,
    { entrepriseAmoId: designation.data.entrepriseAmoId, ...coordonnees.data },
    designation.data.attributionMode,
    { nePasEcraser: true, skipStatusUpdate: parcours.currentStep === Step.INVITATION }
  );
}

/**
 * Renonce à l'AMO et fait avancer le parcours à l'étape ELIGIBILITE, là où l'AMO n'est pas
 * imposé. Écrit une `parcours_amo_validations` en `SANS_AMO` / `AUCUN` / sans entreprise.
 *
 * Deux appelants : le demandeur depuis son espace, et l'Aller-vers qui tranche pour lui
 * quand il a recueilli sa réponse (§2.3.2 FLOW-AND-SYNC.md). L'étape `INVITATION` est donc
 * acceptée : un dossier créé par un agent y reste jusqu'au claim, qui route ensuite sur
 * `ELIGIBILITE` en lisant ce statut.
 *
 * **N'écrase jamais une décision existante** : la validation n'est écrite que si le parcours
 * n'en a aucune. Un demandeur ayant déjà choisi — ou une AMO déjà sollicitée — prime.
 */
export async function passerEnAutonomie(parcours: ParcoursPrevention): Promise<ActionResult<{ message: string }>> {
  if (!ETAPES_SELECTION_AMO.includes(parcours.currentStep) || parcours.currentStatus !== Status.TODO) {
    return { success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" };
  }

  if (parcours.archivedAt) {
    return { success: false, error: "Le dossier est archivé : l'accompagnement ne peut plus être modifié" };
  }

  // USER-first avec repli agent : un dossier créé par un Aller-vers n'a que la simulation
  // de l'agent, et lire la seule simulation du demandeur faisait échouer l'autonomie.
  const codeInsee = normalizeCodeInsee(getDemandeurFirstLogement(parcours)?.commune);
  if (!codeInsee) {
    return { success: false, error: "Simulation RGA non complétée (code INSEE invalide)" };
  }

  if (estAmoObligatoire(getCodeDepartementFromCodeInsee(codeInsee))) {
    return { success: false, error: "L'AMO est obligatoire pour ce département" };
  }

  const [validation] = await db
    .insert(parcoursAmoValidations)
    .values({
      parcoursId: parcours.id,
      entrepriseAmoId: null,
      statut: StatutValidationAmo.SANS_AMO,
      attributionMode: AttributionAmoMode.AUCUN,
    })
    .onConflictDoNothing({ target: parcoursAmoValidations.parcoursId })
    .returning({ id: parcoursAmoValidations.id });

  if (!validation) {
    return { success: false, error: "Un accompagnement a déjà été décidé pour ce dossier" };
  }

  // À l'étape invitation, c'est le claim qui posera ELIGIBILITE en lisant ce statut.
  if (parcours.currentStep === Step.CHOIX_AMO) {
    await parcoursRepo.updateStep(parcours.id, Step.ELIGIBILITE, Status.TODO);
  }

  return {
    success: true,
    data: { message: "Parcours avancé à l'étape éligibilité sans AMO" },
  };
}

/** Variante par `userId` : le demandeur renonce à l'AMO depuis son espace. */
export async function skipAmoStepForUser(userId: string): Promise<ActionResult<{ message: string }>> {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }
  return passerEnAutonomie(parcours);
}

export interface DemanderAccompagnementResult {
  amoNom: string;
  demandeurPrenom: string;
  demandeurNom: string;
  /** Le dossier d'éligibilité (préremplissage "Pas de mandataire") a été réinitialisé. */
  formulaireReinitialise: boolean;
}

/**
 * Demande un accompagnement AMO après avoir choisi l'autonomie (mode FACULTATIF).
 *
 * Symétrique de `skipAmoStepForUser` : bascule la validation `SANS_AMO` -> `EN_ATTENTE`
 * avec l'AMO du territoire (celle choisie par le demandeur s'il y en a plusieurs), sans repasser par CHOIX_AMO — le parcours a déjà avancé à
 * ÉLIGIBILITE. Le `currentStep`/`currentStatus` du parcours ne sont pas touchés (l'étape
 * éligibilité reste pilotée par la sync DS, indépendamment de la validation AMO).
 */
export async function demanderAccompagnementDemandeur(
  userId: string,
  entrepriseAmoIdChoisie?: string
): Promise<ActionResult<DemanderAccompagnementResult>> {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  const [validation] = await db
    .select({ statut: parcoursAmoValidations.statut })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
    .limit(1);
  if (!validation || validation.statut !== StatutValidationAmo.SANS_AMO) {
    return { success: false, error: "Vous gérez déjà vos démarches avec un accompagnement" };
  }

  const codeInsee = normalizeCodeInsee(getDemandeurFirstLogement(parcours)?.commune);
  if (!codeInsee) {
    return { success: false, error: "Simulation RGA non complétée (code INSEE invalide)" };
  }

  // Même garde que `skipAmoStepForUser`/`annulerAccompagnementDemandeur` : là où l'AMO est
  // obligatoire, ce statut SANS_AMO ne devrait de toute façon jamais exister.
  if (estAmoObligatoire(getCodeDepartementFromCodeInsee(codeInsee))) {
    return { success: false, error: "L'AMO est obligatoire pour ce département" };
  }

  const dossierEligibilite = await getDossierByStep(parcours.id, Step.ELIGIBILITE);
  const eligibiliteDsStatus = (dossierEligibilite?.dsStatus as DSStatus | null) ?? null;
  const dossierArchive = Boolean(parcours.archivedAt);
  if (!peutDemanderAccompagnement({ statut: validation.statut, eligibiliteDsStatus, dossierArchive })) {
    if (dossierArchive) {
      return { success: false, error: "Votre dossier est archivé : l'accompagnement ne peut plus être demandé" };
    }
    return {
      success: false,
      error:
        "Votre formulaire d'éligibilité a été transmis : l'accompagnement ne peut plus être modifié tant que l'administration n'a pas répondu",
    };
  }

  const designation = await designerAmo(
    parcours,
    entrepriseAmoIdChoisie ? { entrepriseAmoId: entrepriseAmoIdChoisie, par: "demandeur" } : undefined
  );
  if (!designation.success) {
    return designation;
  }

  const coordonnees = await coordonneesDemandeur(userId, parcours);
  if (!coordonnees.success) {
    return coordonnees;
  }

  const selectResult = await selectAmoForUser(
    userId,
    { entrepriseAmoId: designation.data.entrepriseAmoId, ...coordonnees.data },
    designation.data.attributionMode,
    { skipStepGuard: true, skipStatusUpdate: true }
  );
  if (!selectResult.success) {
    return selectResult;
  }

  // Le dossier d'éligibilité déjà créé sans AMO (préremplissage "Pas de mandataire", pas de
  // SIRET) ne peut pas être corrigé via l'API DN — préremplissage = création seulement (§2.6
  // FLOW-AND-SYNC.md). Best-effort : s'il n'est pas encore déposé, on le réinitialise pour
  // qu'un nouveau prérempli à jour soit recréé au prochain retour du demandeur sur l'étape.
  // S'il est déjà déposé (ou vient de l'être), la réinitialisation refuse — rien à faire côté
  // applicatif, le dossier garde des infos AMO obsolètes.
  const reinitResult = await reinitialiserDossierEtape(parcours.id, Step.ELIGIBILITE);
  const formulaireReinitialise = reinitResult.success && reinitResult.data.statut === "a_recreer";

  const [amo] = await db
    .select({ nom: entreprisesAmo.nom })
    .from(entreprisesAmo)
    .where(eq(entreprisesAmo.id, designation.data.entrepriseAmoId))
    .limit(1);

  return {
    success: true,
    data: {
      amoNom: amo?.nom ?? "",
      demandeurPrenom: coordonnees.data.userPrenom,
      demandeurNom: coordonnees.data.userNom,
      formulaireReinitialise,
    },
  };
}
