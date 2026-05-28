import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { amoValidationTokens, parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";

import { getAmoById } from "./amo-query.service";
import { ActionResult } from "@/shared/types/action-result.types";
import { StatutValidationAmo } from "../domain/value-objects";
import { ValidationAmoData } from "../domain/entities";
import { Status, Step } from "../../core";
import { normalizeCodeInsee } from "../utils/amo.utils";

/**
 * Service de gestion des validations AMO (approve/reject/get)
 * La sélection AMO est dans amo-selection.service.ts
 *
 * Garanties :
 * - **Idempotence** : un second appel sur une validation déjà traitée (valideeAt
 *   non null) retourne `success: true, alreadyProcessed: true` sans muter la BDD.
 * - **Transition atomique** : la mise à jour de la validation, du token et du
 *   parcours est faite dans une seule transaction. La transition du parcours
 *   est conditionnée sur l'état attendu (CHOIX_AMO/INVITATION) — un parcours
 *   déjà progressé ne sera pas re-poussé.
 *
 * Ces deux propriétés ferment la race observée en prod où deux appels
 * concurrents à approveValidation faisaient avancer le parcours de DEUX étapes
 * (CHOIX_AMO → ELIGIBILITE → DIAGNOSTIC) au lieu d'une seule.
 */

interface ApproveValidationData {
  message: string;
  alreadyProcessed: boolean;
  valideeAt: Date;
}

/**
 * Approuve la validation (logement éligible).
 *
 * Transition métier : `CHOIX_AMO/EN_INSTRUCTION → ELIGIBILITE/TODO`
 * (ou no-op sur le step si le parcours n'est plus à CHOIX_AMO/INVITATION).
 */
export async function approveValidation(
  validationId: string,
  commentaire?: string
): Promise<ActionResult<ApproveValidationData>> {
  try {
    return await db.transaction(async (tx) => {
      const now = new Date();

      // 1. UPDATE conditionnel : ne marque la validation comme validée que si
      //    elle ne l'est pas déjà. Sous READ COMMITTED, deux UPDATE concurrents
      //    sur la même ligne sont sérialisés ; le 2e réévalue valideeAt IS NULL
      //    après le commit du 1er → retourne 0 row.
      const [validation] = await tx
        .update(parcoursAmoValidations)
        .set({
          statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
          commentaire: commentaire || null,
          valideeAt: now,
        })
        .where(
          and(
            eq(parcoursAmoValidations.id, validationId),
            isNull(parcoursAmoValidations.valideeAt)
          )
        )
        .returning({
          id: parcoursAmoValidations.id,
          parcoursId: parcoursAmoValidations.parcoursId,
        });

      if (!validation) {
        // Soit la validation n'existe pas, soit elle est déjà validée.
        // On lit l'état pour distinguer et donner le bon feedback.
        const [existing] = await tx
          .select({
            id: parcoursAmoValidations.id,
            valideeAt: parcoursAmoValidations.valideeAt,
          })
          .from(parcoursAmoValidations)
          .where(eq(parcoursAmoValidations.id, validationId))
          .limit(1);

        if (!existing) {
          return { success: false, error: "Validation non trouvée" };
        }

        return {
          success: true,
          data: {
            message: "Demande déjà traitée",
            alreadyProcessed: true,
            valideeAt: existing.valideeAt as Date,
          },
        };
      }

      // 2. Marquer le token comme utilisé (idempotent : un même UPDATE deux fois
      //    écrit la même valeur).
      await tx
        .update(amoValidationTokens)
        .set({ usedAt: now })
        .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

      // 3. Transition atomique du parcours : CHOIX_AMO → ELIGIBILITE/TODO.
      //    Conditionnée sur (currentStep IN [CHOIX_AMO, INVITATION]) pour ne PAS
      //    re-progresser un parcours qui est déjà ailleurs (sécurité face à un
      //    code path concurrent qui aurait déjà avancé le step).
      const [parcoursUpdated] = await tx
        .update(parcoursPrevention)
        .set({
          currentStep: Step.ELIGIBILITE,
          currentStatus: Status.TODO,
        })
        .where(
          and(
            eq(parcoursPrevention.id, validation.parcoursId),
            inArray(parcoursPrevention.currentStep, [Step.CHOIX_AMO, Step.INVITATION])
          )
        )
        .returning({ id: parcoursPrevention.id });

      if (!parcoursUpdated) {
        console.warn(
          `[approveValidation] parcours ${validation.parcoursId} déjà progressé hors CHOIX_AMO/INVITATION — step non touché`
        );
      }

      return {
        success: true,
        data: {
          message: "Logement validé comme éligible",
          alreadyProcessed: false,
          valideeAt: now,
        },
      };
    });
  } catch (error) {
    console.error("Erreur approveValidation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la validation",
    };
  }
}

interface RejectValidationData {
  message: string;
  alreadyProcessed: boolean;
  valideeAt: Date;
}

/**
 * Refuse l'éligibilité du logement.
 *
 * Transition métier : `CHOIX_AMO/EN_INSTRUCTION → CHOIX_AMO/TODO`
 * (le step reste, le status repasse à TODO pour permettre une nouvelle sélection AMO).
 */
export async function rejectEligibility(
  validationId: string,
  commentaire: string
): Promise<ActionResult<RejectValidationData>> {
  try {
    return await db.transaction(async (tx) => {
      const now = new Date();

      const [validation] = await tx
        .update(parcoursAmoValidations)
        .set({
          statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
          commentaire,
          valideeAt: now,
        })
        .where(
          and(
            eq(parcoursAmoValidations.id, validationId),
            isNull(parcoursAmoValidations.valideeAt)
          )
        )
        .returning({
          id: parcoursAmoValidations.id,
          parcoursId: parcoursAmoValidations.parcoursId,
        });

      if (!validation) {
        const [existing] = await tx
          .select({
            id: parcoursAmoValidations.id,
            valideeAt: parcoursAmoValidations.valideeAt,
          })
          .from(parcoursAmoValidations)
          .where(eq(parcoursAmoValidations.id, validationId))
          .limit(1);

        if (!existing) {
          return { success: false, error: "Validation non trouvée" };
        }

        return {
          success: true,
          data: {
            message: "Demande déjà traitée",
            alreadyProcessed: true,
            valideeAt: existing.valideeAt as Date,
          },
        };
      }

      await tx
        .update(amoValidationTokens)
        .set({ usedAt: now })
        .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

      // Reset du status parcours à TODO, conditionné sur step = CHOIX_AMO pour
      // ne pas perturber un parcours qui aurait été progressé par ailleurs.
      await tx
        .update(parcoursPrevention)
        .set({ currentStatus: Status.TODO })
        .where(
          and(
            eq(parcoursPrevention.id, validation.parcoursId),
            eq(parcoursPrevention.currentStep, Step.CHOIX_AMO)
          )
        );

      return {
        success: true,
        data: {
          message: "Logement refusé : non éligible",
          alreadyProcessed: false,
          valideeAt: now,
        },
      };
    });
  } catch (error) {
    console.error("Erreur rejectEligibility:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du refus",
    };
  }
}

/**
 * Récupère les données de validation par token
 */
export async function getValidationByToken(token: string): Promise<ActionResult<ValidationAmoData>> {
  // Récupérer le token avec toutes les données associées
  const [tokenData] = await db
    .select({
      tokenId: amoValidationTokens.id,
      expiresAt: amoValidationTokens.expiresAt,
      usedAt: amoValidationTokens.usedAt,
      validationId: parcoursAmoValidations.id,
      statut: parcoursAmoValidations.statut,
      choisieAt: parcoursAmoValidations.choisieAt,
      entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId,
      userNom: parcoursAmoValidations.userNom,
      userPrenom: parcoursAmoValidations.userPrenom,
      userEmail: parcoursAmoValidations.userEmail,
      userTelephone: parcoursAmoValidations.userTelephone,
      adresseLogement: parcoursAmoValidations.adresseLogement,
      parcoursId: parcoursPrevention.id,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
    })
    .from(amoValidationTokens)
    .innerJoin(parcoursAmoValidations, eq(amoValidationTokens.parcoursAmoValidationId, parcoursAmoValidations.id))
    .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .where(eq(amoValidationTokens.token, token))
    .limit(1);

  const userCodeInsee = normalizeCodeInsee(tokenData?.rgaSimulationData?.logement?.commune) || "";

  if (!tokenData) {
    return {
      success: false,
      error: "Token invalide ou introuvable",
    };
  }

  const isExpired = tokenData.expiresAt < new Date();
  if (isExpired) {
    return {
      success: false,
      error: "Ce token a expiré",
    };
  }

  if (!tokenData.entrepriseAmoId) {
    return {
      success: false,
      error: "Validation sans AMO : aucun token attendu",
    };
  }

  // Récupérer l'AMO
  const amo = await getAmoById(tokenData.entrepriseAmoId);
  if (!amo) {
    return {
      success: false,
      error: "AMO non trouvée",
    };
  }

  return {
    success: true,
    data: {
      validationId: tokenData.validationId,
      entrepriseAmo: amo,
      demandeur: {
        codeInsee: userCodeInsee,
        nom: tokenData.userNom || "",
        prenom: tokenData.userPrenom || "",
        email: tokenData.userEmail || "",
        telephone: tokenData.userTelephone || "",
        adresseLogement: tokenData.adresseLogement || "",
      },
      statut: tokenData.statut,
      choisieAt: tokenData.choisieAt,
      usedAt: tokenData.usedAt,
      isExpired,
      isUsed: !!tokenData.usedAt,
    },
  };
}
