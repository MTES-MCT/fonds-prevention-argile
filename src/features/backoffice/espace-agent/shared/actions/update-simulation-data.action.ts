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
import {
  evaluateAgentSimulation,
  buildEligibiliteArchiveNote,
  isEligibiliteArchiveReason,
} from "../services/eligibilite-agent.service";
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
      const wasArchived = Boolean(dossier.parcours.archivedAt);

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

        // 2. Recalcul du verdict d'éligibilité (miroir de la création). Sans verdict
        //    tranché (simulation incomplète, aucun critère bloquant) → rien d'autre.
        const verdict = evaluateAgentSimulation(rgaData);
        if (!verdict.isEligible && !verdict.isNonEligible) return;

        // 2a. Décision de validation AMO : réservée aux dossiers DÉJÀ tranchés. EN_ATTENTE
        //     (validation AMO à venir) et SANS_AMO ne sont PAS auto-décidés par une
        //     correction — l'AMO / l'Aller-vers gardent la main sur la décision. Flip sur
        //     vrai changement de verdict seulement (sinon on écraserait valideeAt).
        //     Le mail d'invitation n'est PAS renvoyé (artefact de création).
        if (decidedStatuts.includes(statutCourant)) {
          const nouveauStatut = verdict.isEligible
            ? StatutValidationAmo.LOGEMENT_ELIGIBLE
            : StatutValidationAmo.LOGEMENT_NON_ELIGIBLE;
          if (nouveauStatut !== statutCourant) {
            await tx
              .update(parcoursAmoValidations)
              .set({ statut: nouveauStatut, valideeAt: now })
              .where(eq(parcoursAmoValidations.id, dossier.validation.id));
          }
        }

        // 2b. Archivage / dé-archivage du parcours : sur TOUS les statuts éditables
        //     (EN_ATTENTE, SANS_AMO, LOGEMENT_*), pour honorer la promesse UI
        //     (« déplacé dans Archivés » dès l'inéligibilité). La catégorie « Archivés »
        //     est pilotée par archivedAt (getDossierEtat), indépendamment du statut de
        //     validation. Idempotent : on n'archive pas un dossier déjà archivé
        //     (archivedAt ne glisse pas) et on ne dé-archive QUE ce qui a été archivé
        //     pour inéligibilité — jamais un archivage manuel (abandon, non-réponse…).
        if (verdict.isNonEligible && !wasArchived) {
          await tx
            .update(parcoursPrevention)
            .set({
              situationParticulier: SituationParticulier.ARCHIVE,
              archivedAt: now,
              archiveReason: buildEligibiliteArchiveNote(verdict.result, "edition"),
              archivedBy: agent.id,
            })
            .where(eq(parcoursPrevention.id, dossier.parcours.id));
        } else if (verdict.isEligible && wasArchived && isEligibiliteArchiveReason(dossier.parcours.archiveReason)) {
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

    // Archivage / dé-archivage du prospect selon le verdict recalculé — même règle que
    // pour un dossier (honore la promesse UI « déplacé dans Archivés »). On n'archive pas
    // deux fois et on ne dé-archive qu'un archivage pour inéligibilité.
    const prospectVerdict = evaluateAgentSimulation(rgaData);
    const prospectWasArchived = Boolean(parcours.archivedAt);
    if (prospectVerdict.isNonEligible && !prospectWasArchived) {
      await parcoursPreventionRepository.updateSituationParticulier(
        parcours.id,
        SituationParticulier.ARCHIVE,
        buildEligibiliteArchiveNote(prospectVerdict.result, "edition"),
        agent.id
      );
    } else if (
      prospectVerdict.isEligible &&
      prospectWasArchived &&
      isEligibiliteArchiveReason(parcours.archiveReason)
    ) {
      await parcoursPreventionRepository.updateSituationParticulier(parcours.id, SituationParticulier.PROSPECT);
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
