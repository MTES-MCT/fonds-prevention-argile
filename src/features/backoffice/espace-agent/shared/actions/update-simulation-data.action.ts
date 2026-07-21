"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import type { ActionResult } from "@/shared/types";
import { evaluateAgentSimulation, buildEligibiliteArchiveNote } from "../services/eligibilite-agent.service";

/**
 * Server action pour sauvegarder les données de simulation éditées par un agent.
 * Accepte un ID de validation AMO (dossier/demande) ou un ID de parcours (prospect).
 *
 * Sécurité :
 * 1. Vérifie l'authentification ProConnect
 * 2. Vérifie le rôle agent (AMO, ALLERS_VERS ou AMO_ET_ALLERS_VERS)
 * 3. Vérifie l'ownership du dossier (même entreprise AMO) si c'est un dossier/demande
 * 4. Vérifie que le dossier est en statut éditable (EN_ATTENTE ou LOGEMENT_ELIGIBLE)
 */
export async function updateSimulationDataAction(
  id: string,
  rgaData: RGASimulationData
): Promise<ActionResult<{ parcoursId: string }>> {
  try {
    // SUPER_ADMIN : lecture seule dans /espace-agent
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    // 1. Authentification ProConnect + agent enregistré
    const agentResult = await getCurrentAgent();

    if (!agentResult.success) {
      return { success: false, error: agentResult.error };
    }

    const agent = agentResult.data;

    // 2. Vérification du rôle agent (AMO, ALLERS_VERS ou AMO_ET_ALLERS_VERS)
    const isAdmin = agent.role === UserRole.SUPER_ADMINISTRATEUR || agent.role === UserRole.ADMINISTRATEUR;
    const isAgent =
      agent.role === UserRole.AMO || agent.role === UserRole.ALLERS_VERS || agent.role === UserRole.AMO_ET_ALLERS_VERS;

    if (!isAdmin && !isAgent) {
      return { success: false, error: "Seuls les agents peuvent modifier les données de simulation" };
    }

    // 3. Essayer d'abord par ID de validation AMO (dossier/demande)
    const [dossier] = await db
      .select({
        validation: parcoursAmoValidations,
        parcours: parcoursPrevention,
      })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(eq(parcoursAmoValidations.id, id))
      .limit(1);

    if (dossier) {
      // Statuts éditables — alignés sur getDossierSimulationData (lecture).
      // LOGEMENT_NON_ELIGIBLE inclus pour corriger une saisie erronée ; SANS_AMO
      // pour les dossiers sans accompagnement AMO pilotés par l'Aller-vers.
      const editableStatuts = [
        StatutValidationAmo.EN_ATTENTE,
        StatutValidationAmo.LOGEMENT_ELIGIBLE,
        StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
        StatutValidationAmo.SANS_AMO,
      ];
      if (!editableStatuts.includes(dossier.validation.statut as StatutValidationAmo)) {
        return { success: false, error: "Ce dossier ne permet pas l'édition des données de simulation" };
      }

      // Vérifier ownership entreprise (sauf admins)
      if (!isAdmin) {
        if (!agent.entrepriseAmoId) {
          return { success: false, error: "Votre compte agent n'est pas configuré" };
        }

        if (dossier.validation.entrepriseAmoId !== agent.entrepriseAmoId) {
          return { success: false, error: "Ce dossier ne vous est pas destiné" };
        }
      }

      // Sauvegarde
      const updated = await parcoursPreventionRepository.updateRGADataAgent(dossier.parcours.id, rgaData, agent.id);

      if (!updated) {
        return { success: false, error: "Erreur lors de la mise à jour" };
      }

      // Recalcul du statut d'éligibilité (miroir de la création). On ne re-décide
      // que pour un dossier dont l'éligibilité était déjà tranchée : EN_ATTENTE
      // (validation AMO à venir) et SANS_AMO ne sont pas auto-décidés par une
      // simple correction de simulation — c'est le geste de validation / qualification
      // qui les tranche. Le mail d'invitation n'est PAS renvoyé (artefact de création,
      // le demandeur a pu déjà réclamer le dossier).
      const decidedStatuts = [StatutValidationAmo.LOGEMENT_ELIGIBLE, StatutValidationAmo.LOGEMENT_NON_ELIGIBLE];
      if (decidedStatuts.includes(dossier.validation.statut as StatutValidationAmo)) {
        const verdict = evaluateAgentSimulation(rgaData);
        if (verdict.isEligible || verdict.isNonEligible) {
          const nouveauStatut = verdict.isEligible
            ? StatutValidationAmo.LOGEMENT_ELIGIBLE
            : StatutValidationAmo.LOGEMENT_NON_ELIGIBLE;

          await db
            .update(parcoursAmoValidations)
            .set({ statut: nouveauStatut, valideeAt: new Date() })
            .where(eq(parcoursAmoValidations.id, dossier.validation.id));

          if (verdict.isNonEligible) {
            await parcoursPreventionRepository.updateSituationParticulier(
              dossier.parcours.id,
              SituationParticulier.ARCHIVE,
              buildEligibiliteArchiveNote(verdict.result, "edition"),
              agent.id
            );
          } else {
            // Redevenu éligible → dé-archivage (nettoie archivedAt/reason/by).
            await parcoursPreventionRepository.updateSituationParticulier(
              dossier.parcours.id,
              SituationParticulier.PROSPECT
            );
          }
        }
      }

      // Invalider le cache de toutes les pages de l'espace agent
      revalidatePath("/espace-agent", "layout");

      return {
        success: true,
        data: { parcoursId: dossier.parcours.id },
      };
    }

    // 4. Fallback : essayer par ID de parcours (prospect)
    const [parcours] = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, id)).limit(1);

    if (!parcours) {
      return { success: false, error: "Dossier non trouvé" };
    }

    // Sauvegarde pour prospect
    const updated = await parcoursPreventionRepository.updateRGADataAgent(parcours.id, rgaData, agent.id);

    if (!updated) {
      return { success: false, error: "Erreur lors de la mise à jour" };
    }

    // Invalider le cache de toutes les pages de l'espace agent
    revalidatePath("/espace-agent", "layout");

    return {
      success: true,
      data: { parcoursId: parcours.id },
    };
  } catch (error) {
    console.error("[updateSimulationDataAction] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la sauvegarde des données de simulation",
    };
  }
}
