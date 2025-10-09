"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/database/client";
import {
  entreprisesAmo,
  entreprisesAmoCommunes,
  parcoursAmoValidations,
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
 * Passe le parcours en EN_INSTRUCTION (en attente de validation AMO)
 */
export async function choisirAmo(
  entrepriseAmoId: string
): Promise<ActionResult<{ message: string }>> {
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
    await db
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
      });

    // Passer le parcours en EN_INSTRUCTION (en attente de validation AMO)
    await parcoursRepo.updateStatus(parcours.id, Status.EN_INSTRUCTION);

    return {
      success: true,
      data: { message: "AMO sélectionnée avec succès" },
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

    // Passer le parcours en VALIDE pour permettre de passer à l'étape suivante
    await parcoursRepo.updateStatus(validation.parcoursId, Status.VALIDE);

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
