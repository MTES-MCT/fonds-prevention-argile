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
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";

/**
 * Baseline du diff agent = données effectives AVANT la 1re correction. Idempotent :
 * si un baseline existe déjà, on le conserve (les corrections suivantes comparent
 * toujours à l'état d'origine).
 */
function computeAgentEditBaseline(parcours: {
  rgaSimulationDataAgentBaseline: RGASimulationData | null;
  rgaSimulationDataAgent: RGASimulationData | null;
  rgaSimulationData: RGASimulationData | null;
}): RGASimulationData | null {
  return (
    parcours.rgaSimulationDataAgentBaseline ?? parcours.rgaSimulationDataAgent ?? parcours.rgaSimulationData ?? null
  );
}

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

      // Autorisation alignée sur la lecture (getDossierSimulationData), sinon
      // désalignement lecture/écriture : dossier AVEC entreprise AMO → ownership
      // entreprise ; dossier SANS entreprise (SANS_AMO) → accès territorial (un
      // Aller-vers n'a pas d'entrepriseAmoId et serait refusé à tort).
      if (!isAdmin) {
        if (dossier.validation.entrepriseAmoId) {
          if (!agent.entrepriseAmoId) {
            return { success: false, error: "Votre compte agent n'est pas configuré" };
          }
          if (dossier.validation.entrepriseAmoId !== agent.entrepriseAmoId) {
            return { success: false, error: "Ce dossier ne vous est pas destiné" };
          }
        } else {
          const territoryError = await verifyProspectTerritoryAccess(dossier.parcours.id, {
            id: agent.id,
            role: agent.role as UserRole,
            entrepriseAmoId: agent.entrepriseAmoId ?? null,
            allersVersId: agent.allersVersId ?? null,
          });
          if (territoryError) {
            return { success: false, error: territoryError };
          }
        }
      }

      // Écriture atomique : la simulation, le statut de validation et l'archivage
      // doivent rester cohérents. Sans transaction, un échec intermédiaire laisserait
      // la simu à jour mais le statut/archivage désynchronisés. Pattern inline-tx
      // aligné sur `detachement-amo.service.ts` (les repos n'acceptent pas de `tx`).
      const now = new Date();
      const decidedStatuts = [StatutValidationAmo.LOGEMENT_ELIGIBLE, StatutValidationAmo.LOGEMENT_NON_ELIGIBLE];
      const statutCourant = dossier.validation.statut as StatutValidationAmo;

      await db.transaction(async (tx) => {
        // 1. Simulation agent + baseline (données AVANT 1re correction) pour le diff.
        await tx
          .update(parcoursPrevention)
          .set({
            rgaSimulationDataAgent: rgaData,
            rgaSimulationDataAgentBaseline: computeAgentEditBaseline(dossier.parcours),
            rgaSimulationAgentEditedAt: now,
            rgaSimulationAgentEditedBy: agent.id,
          })
          .where(eq(parcoursPrevention.id, dossier.parcours.id));

        // 2. Recalcul du statut d'éligibilité (miroir de la création). On ne re-décide
        //    que pour un dossier déjà tranché : EN_ATTENTE (validation AMO à venir) et
        //    SANS_AMO ne sont pas auto-décidés par une simple correction. Le mail
        //    d'invitation n'est PAS renvoyé (artefact de création, dossier peut-être déjà réclamé).
        if (!decidedStatuts.includes(statutCourant)) return;

        const verdict = evaluateAgentSimulation(rgaData);
        const nouveauStatut = verdict.isEligible
          ? StatutValidationAmo.LOGEMENT_ELIGIBLE
          : verdict.isNonEligible
            ? StatutValidationAmo.LOGEMENT_NON_ELIGIBLE
            : null;

        // Effets de bord UNIQUEMENT sur un vrai changement de verdict : sinon chaque
        // sauvegarde écraserait valideeAt, ferait glisser archivedAt, ou dé-archiverait
        // un dossier archivé pour une autre raison.
        if (!nouveauStatut || nouveauStatut === statutCourant) return;

        await tx
          .update(parcoursAmoValidations)
          .set({ statut: nouveauStatut, valideeAt: now })
          .where(eq(parcoursAmoValidations.id, dossier.validation.id));

        if (verdict.isNonEligible) {
          await tx
            .update(parcoursPrevention)
            .set({
              situationParticulier: SituationParticulier.ARCHIVE,
              archivedAt: now,
              archiveReason: buildEligibiliteArchiveNote(verdict.result, "edition"),
              archivedBy: agent.id,
            })
            .where(eq(parcoursPrevention.id, dossier.parcours.id));
        } else {
          // Redevenu éligible → dé-archivage (nettoie archivedAt/reason/by).
          await tx
            .update(parcoursPrevention)
            .set({
              situationParticulier: SituationParticulier.PROSPECT,
              archivedAt: null,
              archiveReason: null,
              archivedBy: null,
            })
            .where(eq(parcoursPrevention.id, dossier.parcours.id));
        }
      });

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
    const updated = await parcoursPreventionRepository.updateRGADataAgent(parcours.id, rgaData, agent.id, {
      baseline: computeAgentEditBaseline(parcours),
    });

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
