"use server";

import { eq, and, like, or } from "drizzle-orm";
import { db } from "@/lib/database/client";
import {
  amoValidationTokens,
  entreprisesAmo,
  entreprisesAmoCommunes,
  parcoursAmoValidations,
  parcoursPrevention,
  users,
} from "@/lib/database/schema";
import { getSession } from "@/lib/auth/services/auth.service";
import { parcoursRepo } from "@/lib/database/repositories";
import { Step, Status } from "@/lib/parcours/parcours.types";
import type { ActionResult } from "@/lib/actions/types";
import {
  AmoDisponible,
  StatutValidationAmo,
  ValidationAmoComplete,
} from "@/lib/parcours/amo/amo.types";
import { ROLES } from "@/lib/auth";
import { progressParcours } from "@/lib/database/services";
import { getCodeDepartementFromCodeInsee } from "@/lib/parcours/amo/amo.utils";
import { sendValidationAmoEmail } from "../../email/send-email.actions";

const NB_JOURS_VALIDITE_TOKEN = 30; // Nombre de jours avant expiration du token

/**
 * Récupère la liste des AMO disponibles pour le code INSEE de l'utilisateur
 * Recherche par :
 * 1. Code INSEE exact dans entreprises_amo_communes (prioritaire)
 * 2. Code département extrait du code INSEE dans le champ departements
 */
export async function getAmosDisponibles(): Promise<
  ActionResult<AmoDisponible[]>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    // Récupérer le code INSEE de l'utilisateur
    const [user] = await db
      .select({ codeInsee: users.codeInsee })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user?.codeInsee) {
      return {
        success: false,
        error: "Code INSEE non renseigné pour cet utilisateur",
      };
    }

    // Extraire le code département
    const codeDepartement = getCodeDepartementFromCodeInsee(user.codeInsee);

    // 1. Récupérer les AMO qui ont le code INSEE spécifique
    const amosParCodeInsee = await db
      .selectDistinct({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(entreprisesAmo)
      .innerJoin(
        entreprisesAmoCommunes,
        eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
      )
      .where(eq(entreprisesAmoCommunes.codeInsee, user.codeInsee));

    // 2. Récupérer les AMO qui couvrent le département entier
    // Format recherché : "Seine-et-Marne 77" ou "Gers 32"
    const amosParDepartement = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(entreprisesAmo)
      .where(like(entreprisesAmo.departements, `%${codeDepartement}%`));

    // Fusionner et dédupliquer les résultats par ID
    const amosMap = new Map<string, AmoDisponible>();

    for (const amo of [...amosParCodeInsee, ...amosParDepartement]) {
      if (!amosMap.has(amo.id)) {
        amosMap.set(amo.id, amo);
      }
    }

    const amosDisponibles = Array.from(amosMap.values());

    return {
      success: true,
      data: amosDisponibles,
    };
  } catch (error) {
    console.error("Erreur getAmosDisponibles:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des AMO",
    };
  }
}

/**
 * Récupère la liste de tous les AMO avec leurs codes INSEE
 */
export async function getAllAmos(): Promise<
  ActionResult<Array<AmoDisponible & { communes: { codeInsee: string }[] }>>
> {
  try {
    const session = await getSession();

    if (!session || session.role !== ROLES.ADMIN) {
      throw new Error("Accès refusé");
    }

    // Récupérer les AMO avec leurs communes
    const allAmosWithCommunes = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
        codeInsee: entreprisesAmoCommunes.codeInsee,
      })
      .from(entreprisesAmo)
      .leftJoin(
        entreprisesAmoCommunes,
        eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
      )
      .orderBy(entreprisesAmo.nom);

    // Grouper les codes INSEE par AMO
    const amosMap = new Map<
      string,
      AmoDisponible & { communes: { codeInsee: string }[] }
    >();

    for (const row of allAmosWithCommunes) {
      if (!amosMap.has(row.id)) {
        amosMap.set(row.id, {
          id: row.id,
          nom: row.nom,
          siret: row.siret,
          departements: row.departements,
          emails: row.emails,
          telephone: row.telephone,
          adresse: row.adresse,
          communes: [],
        });
      }

      const amo = amosMap.get(row.id);
      if (amo && row.codeInsee) {
        amo.communes.push({ codeInsee: row.codeInsee });
      }
    }

    return {
      success: true,
      data: Array.from(amosMap.values()),
    };
  } catch (error) {
    console.error("Erreur getAllAmos:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des AMO",
    };
  }
}

/**
 * Choisir une AMO pour le parcours (étape CHOIX_AMO)
 * Crée ou met à jour une entrée dans parcoursAmoValidations
 * Ajoute les données personnelles temporaires (supprimées après validation)
 * Génère un token de validation sécurisé
 * Passe le parcours en EN_INSTRUCTION (en attente de validation AMO)
 * Envoi un mail à l'AMO
 */
export async function choisirAmo(params: {
  entrepriseAmoId: string;
  userPrenom: string;
  userNom: string;
  adresseLogement: string;
}): Promise<ActionResult<{ message: string; token: string }>> {
  try {
    const { entrepriseAmoId, userPrenom, userNom, adresseLogement } = params;

    // Validation des données personnelles
    if (!userPrenom?.trim()) {
      return { success: false, error: "Le prénom est requis" };
    }
    if (!userNom?.trim()) {
      return { success: false, error: "Le nom est requis" };
    }
    if (!adresseLogement?.trim()) {
      return { success: false, error: "L'adresse du logement est requise" };
    }

    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    // Récupérer le parcours de l'utilisateur
    const parcours = await parcoursRepo.findByUserId(session.userId);
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

    // Vérifier que l'AMO existe et couvre bien le code INSEE de l'utilisateur
    const [user] = await db
      .select({ codeInsee: users.codeInsee })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user?.codeInsee) {
      return { success: false, error: "Code INSEE manquant" };
    }

    // Extraire le code département
    const codeDepartement = getCodeDepartementFromCodeInsee(user.codeInsee);

    // Vérifier que l'AMO couvre soit le code INSEE spécifique, soit le département
    const amoValide = await db
      .select({
        id: entreprisesAmo.id,
        departements: entreprisesAmo.departements,
      })
      .from(entreprisesAmo)
      .leftJoin(
        entreprisesAmoCommunes,
        eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
      )
      .where(
        and(
          eq(entreprisesAmo.id, entrepriseAmoId),
          or(
            eq(entreprisesAmoCommunes.codeInsee, user.codeInsee),
            like(entreprisesAmo.departements, `%${codeDepartement}%`)
          )
        )
      )
      .limit(1);

    if (amoValide.length === 0) {
      return {
        success: false,
        error: "Cette AMO ne couvre pas votre commune ou département",
      };
    }

    // Créer ou mettre à jour la validation AMO
    const [validation] = await db
      .insert(parcoursAmoValidations)
      .values({
        parcoursId: parcours.id,
        entrepriseAmoId,
        statut: StatutValidationAmo.EN_ATTENTE,
        userPrenom: userPrenom.trim(),
        userNom: userNom.trim(),
        adresseLogement: adresseLogement.trim(),
      })
      .onConflictDoUpdate({
        target: parcoursAmoValidations.parcoursId,
        set: {
          entrepriseAmoId,
          statut: StatutValidationAmo.EN_ATTENTE,
          choisieAt: new Date(),
          valideeAt: null,
          commentaire: null,
          userPrenom: userPrenom.trim(),
          userNom: userNom.trim(),
          adresseLogement: adresseLogement.trim(),
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
    expiresAt.setDate(expiresAt.getDate() + NB_JOURS_VALIDITE_TOKEN);

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
      demandeurCodeInsee: user.codeInsee,
      adresseLogement,
      token,
    });

    if (!emailResult.success) {
      console.error("Erreur envoi email AMO:", emailResult.error);
      // On continue quand même, l'email n'est pas bloquant
    }

    // Passer le parcours en EN_INSTRUCTION (en attente de validation AMO)
    await parcoursRepo.updateStatus(parcours.id, Status.EN_INSTRUCTION);

    return {
      success: true,
      data: {
        message: "AMO sélectionnée avec succès",
        token,
      },
    };
  } catch (error) {
    console.error("Erreur choisirAmo:", error);
    return {
      success: false,
      error: "Erreur lors de la sélection de l'AMO",
    };
  }
}

/**
 * Valider que le logement est éligible (action réalisée par l'AMO)
 * Fait progresser le parcours vers l'étape ELIGIBILITE avec création du dossier DS
 */
export async function validerLogementEligible(
  validationId: string,
  commentaire?: string
): Promise<ActionResult<{ message: string }>> {
  try {
    // Récupérer la validation pour avoir le parcoursId
    const [validation] = await db
      .select({
        id: parcoursAmoValidations.id,
        parcoursId: parcoursAmoValidations.parcoursId,
      })
      .from(parcoursAmoValidations)
      .where(eq(parcoursAmoValidations.id, validationId))
      .limit(1);

    if (!validation) {
      return { success: false, error: "Validation non trouvée" };
    }

    // Récupérer le userId depuis le parcours
    const parcours = await parcoursRepo.findById(validation.parcoursId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    // Mettre à jour la validation AMO
    await db
      .update(parcoursAmoValidations)
      .set({
        statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
        commentaire: commentaire || null,
        valideeAt: new Date(),
      })
      .where(eq(parcoursAmoValidations.id, validationId));

    // Marquer le token comme utilisé
    await db
      .update(amoValidationTokens)
      .set({ usedAt: new Date() })
      .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

    // Supprimer les données personnelles (RGPD)
    const deleteResult = await deleteUserInfoInAmoValidation(validationId);
    if (!deleteResult.success) {
      console.error("Erreur suppression données perso:", deleteResult.error);
      // On continue quand même, ce n'est pas bloquant
    }

    // Passer le parcours en VALIDE pour permettre la progression
    await parcoursRepo.updateStatus(validation.parcoursId, Status.VALIDE);

    // Faire progresser vers l'étape ELIGIBILITE avec création du dossier DS
    const progressResult = await progressParcours(parcours.userId);

    if (!progressResult.success) {
      return {
        success: false,
        error: "Erreur lors de la progression vers l'éligibilité",
      };
    }

    return {
      success: true,
      data: { message: "Logement validé comme éligible" },
    };
  } catch (error) {
    console.error("Erreur validerLogementEligible:", error);
    return {
      success: false,
      error: "Erreur lors de la validation",
    };
  }
}

/**
 * Refuser le logement (non éligible) (action réalisée par l'AMO)
 * Le parcours repasse en TODO pour permettre à l'utilisateur de choisir une autre AMO
 * ou de corriger sa situation
 */
export async function refuserLogementNonEligible(
  validationId: string,
  commentaire: string
): Promise<ActionResult<{ message: string }>> {
  try {
    // Mettre à jour la validation
    const [validation] = await db
      .update(parcoursAmoValidations)
      .set({
        statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
        commentaire,
        valideeAt: new Date(),
      })
      .where(eq(parcoursAmoValidations.id, validationId))
      .returning();

    if (!validation) {
      return { success: false, error: "Validation non trouvée" };
    }

    // Marquer le token comme utilisé
    await db
      .update(amoValidationTokens)
      .set({ usedAt: new Date() })
      .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

    // Supprimer les données personnelles (RGPD)
    const deleteResult = await deleteUserInfoInAmoValidation(validationId);
    if (!deleteResult.success) {
      console.error("Erreur suppression données perso:", deleteResult.error);
      // On continue quand même, ce n'est pas bloquant
    }

    // Repasser le parcours en TODO pour permettre à l'utilisateur de choisir une autre AMO
    // ou de corriger sa situation
    await parcoursRepo.updateStatus(validation.parcoursId, Status.TODO);

    return {
      success: true,
      data: { message: "Logement refusé : non éligible" },
    };
  } catch (error) {
    console.error("Erreur refuserLogementNonEligible:", error);
    return {
      success: false,
      error: "Erreur lors du refus",
    };
  }
}

/**
 * Refuser l'accompagnement (action réalisée par l'AMO)
 * Le parcours repasse en TODO pour permettre à l'utilisateur de choisir une autre AMO
 */
export async function refuserAccompagnement(
  validationId: string,
  commentaire: string
): Promise<ActionResult<{ message: string }>> {
  try {
    // Mettre à jour la validation
    const [validation] = await db
      .update(parcoursAmoValidations)
      .set({
        statut: StatutValidationAmo.ACCOMPAGNEMENT_REFUSE,
        commentaire,
        valideeAt: new Date(),
      })
      .where(eq(parcoursAmoValidations.id, validationId))
      .returning();

    if (!validation) {
      return { success: false, error: "Validation non trouvée" };
    }

    // Marquer le token comme utilisé
    await db
      .update(amoValidationTokens)
      .set({ usedAt: new Date() })
      .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

    // Supprimer les données personnelles (RGPD)
    const deleteResult = await deleteUserInfoInAmoValidation(validationId);
    if (!deleteResult.success) {
      console.error("Erreur suppression données perso:", deleteResult.error);
      // On continue quand même, ce n'est pas bloquant
    }

    // Repasser le parcours en TODO pour permettre à l'utilisateur de choisir une autre AMO
    await parcoursRepo.updateStatus(validation.parcoursId, Status.TODO);

    return {
      success: true,
      data: { message: "Accompagnement refusé" },
    };
  } catch (error) {
    console.error("Erreur refuserAccompagnement:", error);
    return {
      success: false,
      error: "Erreur lors du refus",
    };
  }
}

/**
 * Récupérer la validation AMO complète pour le parcours de l'utilisateur connecté
 * (inclut les infos de l'entreprise AMO)
 */
export async function getValidationAmo(): Promise<
  ActionResult<ValidationAmoComplete | null>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [validation] = await db
      .select({
        id: parcoursAmoValidations.id,
        parcoursId: parcoursAmoValidations.parcoursId,
        statut: parcoursAmoValidations.statut,
        commentaire: parcoursAmoValidations.commentaire,
        choisieAt: parcoursAmoValidations.choisieAt,
        valideeAt: parcoursAmoValidations.valideeAt,
        entrepriseAmo: {
          id: entreprisesAmo.id,
          nom: entreprisesAmo.nom,
          siret: entreprisesAmo.siret,
          departements: entreprisesAmo.departements,
          emails: entreprisesAmo.emails,
          telephone: entreprisesAmo.telephone,
          adresse: entreprisesAmo.adresse,
        },
      })
      .from(parcoursAmoValidations)
      .innerJoin(
        entreprisesAmo,
        eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id)
      )
      .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
      .limit(1);

    return {
      success: true,
      data: validation || null,
    };
  } catch (error) {
    console.error("Erreur getValidationAmo:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération",
    };
  }
}

/**
 * Récupérer uniquement les informations de l'AMO choisie pour le parcours de l'utilisateur
 * Plus léger que getValidationAmo car ne retourne que les infos de l'entreprise
 */
export async function getAmoChoisie(): Promise<
  ActionResult<AmoDisponible | null>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [amoChoisie] = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(parcoursAmoValidations)
      .innerJoin(
        entreprisesAmo,
        eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id)
      )
      .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
      .limit(1);

    return {
      success: true,
      data: amoChoisie || null,
    };
  } catch (error) {
    console.error("Erreur getAmoChoisie:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'AMO",
    };
  }
}

/**
 * Récupérer uniquement l'id et le nom de l'AMO qui a refusé l'accompagnement
 */
export async function getAmoRefusee(): Promise<
  ActionResult<{ id: string; nom: string } | null>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [amoRefusee] = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
      })
      .from(parcoursAmoValidations)
      .innerJoin(
        entreprisesAmo,
        eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id)
      )
      .where(
        and(
          eq(parcoursAmoValidations.parcoursId, parcours.id),
          eq(
            parcoursAmoValidations.statut,
            StatutValidationAmo.ACCOMPAGNEMENT_REFUSE
          )
        )
      )
      .limit(1);

    return {
      success: true,
      data: amoRefusee || null,
    };
  } catch (error) {
    console.error("Erreur getAmoRefusee:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'AMO refusée",
    };
  }
}

/**
 * Récupérer les données de validation associées à un token
 * Vérifie que le token existe et n'est pas expiré
 * Retourne aussi si le token a déjà été utilisé
 */
export async function getValidationDataByToken(token: string): Promise<
  ActionResult<{
    validationId: string;
    entrepriseAmo: AmoDisponible;
    demandeur: {
      codeInsee: string;
      nom: string;
      prenom: string;
      adresseLogement: string;
    };
    statut: StatutValidationAmo;
    choisieAt: Date;
    usedAt: Date | null;
    isExpired: boolean;
    isUsed: boolean;
  }>
> {
  try {
    // Récupérer le token avec toutes les données associées
    const [tokenData] = await db
      .select({
        tokenId: amoValidationTokens.id,
        expiresAt: amoValidationTokens.expiresAt,
        usedAt: amoValidationTokens.usedAt,
        validationId: parcoursAmoValidations.id,
        statut: parcoursAmoValidations.statut,
        choisieAt: parcoursAmoValidations.choisieAt,
        entrepriseAmoId: entreprisesAmo.id,
        entrepriseAmoNom: entreprisesAmo.nom,
        entrepriseAmoSiret: entreprisesAmo.siret,
        entrepriseAmoDepartements: entreprisesAmo.departements,
        entrepriseAmoEmails: entreprisesAmo.emails,
        entrepriseAmoTelephone: entreprisesAmo.telephone,
        entrepriseAmoAdresse: entreprisesAmo.adresse,
        userCodeInsee: users.codeInsee,
        userNom: parcoursAmoValidations.userNom,
        userPrenom: parcoursAmoValidations.userPrenom,
        adresseLogement: parcoursAmoValidations.adresseLogement,
        parcoursId: parcoursPrevention.id,
      })
      .from(amoValidationTokens)
      .innerJoin(
        parcoursAmoValidations,
        eq(
          amoValidationTokens.parcoursAmoValidationId,
          parcoursAmoValidations.id
        )
      )
      .innerJoin(
        entreprisesAmo,
        eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id)
      )
      .innerJoin(
        parcoursPrevention,
        eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id)
      )
      .innerJoin(users, eq(parcoursPrevention.userId, users.id))
      .where(eq(amoValidationTokens.token, token))
      .limit(1);

    if (!tokenData) {
      return {
        success: false,
        error: "Token invalide ou introuvable",
      };
    }

    const isExpired = tokenData.expiresAt < new Date();
    const isUsed = !!tokenData.usedAt;

    // Vérifier si le token est expiré
    if (isExpired) {
      return {
        success: false,
        error: "Ce token a expiré",
      };
    }

    return {
      success: true,
      data: {
        validationId: tokenData.validationId,
        entrepriseAmo: {
          id: tokenData.entrepriseAmoId,
          nom: tokenData.entrepriseAmoNom,
          siret: tokenData.entrepriseAmoSiret,
          departements: tokenData.entrepriseAmoDepartements,
          emails: tokenData.entrepriseAmoEmails,
          telephone: tokenData.entrepriseAmoTelephone,
          adresse: tokenData.entrepriseAmoAdresse,
        },
        demandeur: {
          codeInsee: tokenData.userCodeInsee || "",
          nom: tokenData.userNom || "",
          prenom: tokenData.userPrenom || "",
          adresseLogement: tokenData.adresseLogement || "",
        },
        statut: tokenData.statut,
        choisieAt: tokenData.choisieAt,
        usedAt: tokenData.usedAt,
        isExpired,
        isUsed,
      },
    };
  } catch (error) {
    console.error("Erreur getValidationDataByToken:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données",
    };
  }
}

/**
 * Supprime les informations personnelles d'une validation AMO
 * @param parcoursAmoValidationId
 * @returns
 */
export async function deleteUserInfoInAmoValidation(
  parcoursAmoValidationId: string
): Promise<ActionResult<{ message: string }>> {
  try {
    // Vérifier que la validation existe
    const [validation] = await db
      .select({ id: parcoursAmoValidations.id })
      .from(parcoursAmoValidations)
      .where(eq(parcoursAmoValidations.id, parcoursAmoValidationId))
      .limit(1);

    if (!validation) {
      return {
        success: false,
        error: "Validation AMO non trouvée",
      };
    }

    // Supprimer les données personnelles
    await db
      .update(parcoursAmoValidations)
      .set({
        userPrenom: null,
        userNom: null,
        adresseLogement: null,
      })
      .where(eq(parcoursAmoValidations.id, parcoursAmoValidationId));

    return {
      success: true,
      data: {
        message: "Données personnelles supprimées avec succès",
      },
    };
  } catch (error) {
    console.error("Erreur deleteUserInfoInAmoValidation:", error);
    return {
      success: false,
      error: "Erreur lors de la suppression des données personnelles",
    };
  }
}
