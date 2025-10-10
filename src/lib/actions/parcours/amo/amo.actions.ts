"use server";

import { eq, and } from "drizzle-orm";
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

const NB_JOURS_VALIDITE_TOKEN = 30; // Nombre de jours avant expiration du token

/**
 * Récupère la liste des AMO disponibles pour le code INSEE de l'utilisateur
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

    // Récupérer les AMO qui couvrent ce code INSEE
    const amosDisponibles = await db
      .selectDistinct({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        email: entreprisesAmo.email,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(entreprisesAmo)
      .innerJoin(
        entreprisesAmoCommunes,
        eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
      )
      .where(eq(entreprisesAmoCommunes.codeInsee, user.codeInsee));

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
  ActionResult<
    Array<
      AmoDisponible & {
        communes: { codeInsee: string }[];
      }
    >
  >
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
        email: entreprisesAmo.email,
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
          email: row.email,
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
 * Génère un token de validation sécurisé
 * Passe le parcours en EN_INSTRUCTION (en attente de validation AMO)
 */
export async function choisirAmo(
  entrepriseAmoId: string
): Promise<ActionResult<{ message: string; token: string }>> {
  try {
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

    const amoValide = await db
      .select({ id: entreprisesAmo.id })
      .from(entreprisesAmo)
      .innerJoin(
        entreprisesAmoCommunes,
        eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
      )
      .where(
        and(
          eq(entreprisesAmo.id, entrepriseAmoId),
          eq(entreprisesAmoCommunes.codeInsee, user.codeInsee)
        )
      )
      .limit(1);

    if (amoValide.length === 0) {
      return {
        success: false,
        error: "Cette AMO ne couvre pas votre commune",
      };
    }

    // Créer ou mettre à jour la validation AMO
    const [validation] = await db
      .insert(parcoursAmoValidations)
      .values({
        parcoursId: parcours.id,
        entrepriseAmoId,
        statut: StatutValidationAmo.EN_ATTENTE,
      })
      .onConflictDoUpdate({
        target: parcoursAmoValidations.parcoursId,
        set: {
          entrepriseAmoId,
          statut: StatutValidationAmo.EN_ATTENTE,
          choisieAt: new Date(),
          valideeAt: null,
          commentaire: null,
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
 * Passe le parcours à l'étape ELIGIBILITE en TODO
 */
export async function validerLogementEligible(
  validationId: string,
  commentaire?: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    // TODO: Vérifier que l'utilisateur est bien un admin AMO
    // Pour l'instant, on suppose que seuls les admins peuvent appeler cette action

    // Mettre à jour la validation
    const [validation] = await db
      .update(parcoursAmoValidations)
      .set({
        statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
        commentaire: commentaire || null,
        valideeAt: new Date(),
      })
      .where(eq(parcoursAmoValidations.id, validationId))
      .returning();

    if (!validation) {
      return { success: false, error: "Validation non trouvée" };
    }

    // Passer à l'étape ELIGIBILITE en TODO
    await parcoursRepo.updateStep(
      validation.parcoursId,
      Step.ELIGIBILITE,
      Status.TODO
    );

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
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

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
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

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
          email: entreprisesAmo.email,
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
        email: entreprisesAmo.email,
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
 * Vérifie que le token existe, n'est pas expiré et n'a pas été utilisé
 */
export async function getValidationDataByToken(token: string): Promise<
  ActionResult<{
    validationId: string;
    entrepriseAmo: AmoDisponible;
    demandeur: {
      // firstName: string;
      // lastName: string;
      // email: string;
      codeInsee: string;
    };
    statut: StatutValidationAmo;
    choisieAt: Date;
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
        entrepriseAmoEmail: entreprisesAmo.email,
        entrepriseAmoTelephone: entreprisesAmo.telephone,
        entrepriseAmoAdresse: entreprisesAmo.adresse,
        // userFirstName: users.firstName, // TODO ? voir avec Martin si on stocke le prénom dans users ou dans parcours_prevention
        // userLastName: users.lastName, // TODO ? voir avec Martin si on stocke
        // userEmail: users.email, // TODO ? voir avec Martin si on stocke
        userCodeInsee: users.codeInsee,
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

    // Vérifier si le token a déjà été utilisé
    if (tokenData.usedAt) {
      return {
        success: false,
        error: "Ce token a déjà été utilisé",
      };
    }

    // Vérifier si le token est expiré
    if (tokenData.expiresAt < new Date()) {
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
          email: tokenData.entrepriseAmoEmail,
          telephone: tokenData.entrepriseAmoTelephone,
          adresse: tokenData.entrepriseAmoAdresse,
        },
        demandeur: {
          // firstName: tokenData.userFirstName,
          // lastName: tokenData.userLastName,
          // email: tokenData.userEmail,
          codeInsee: tokenData.userCodeInsee || "",
        },
        statut: tokenData.statut,
        choisieAt: tokenData.choisieAt,
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
