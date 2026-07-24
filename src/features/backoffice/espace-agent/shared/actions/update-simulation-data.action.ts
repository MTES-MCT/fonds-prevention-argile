"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import {
  SituationParticulier,
  situationApresReactivation,
} from "@/shared/domain/value-objects/situation-particulier.enum";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import type { ActionResult } from "@/shared/types";
import {
  evaluateAgentSimulation,
  buildEligibiliteArchiveNote,
  isEligibiliteArchiveReason,
} from "../services/eligibilite-agent.service";
import {
  verifyProspectTerritoryAccess,
  calculateAgentScope,
} from "@/features/auth/permissions/services/agent-scope.service";
import { parcoursActionsRepo } from "@/shared/database/repositories";
import { buildAuthorSnapshot } from "../services/author-snapshot";
import { ACTION_TYPE_ELIGIBILITE_REFUSEE } from "../domain/types/action.types";

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

      // Calculé dans la transaction, utilisé après coup pour l'audit (parcours_actions).
      let didRefuserNonEligible = false;

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

        // 2a. Décision de validation AMO. Un verdict NON ÉLIGIBLE tranche TOUJOURS le
        //     dossier (EN_ATTENTE et SANS_AMO compris) : la simulation est la source de
        //     vérité du critère d'éligibilité, donc un agent qui la corrige en non-éligible
        //     doit refuser l'accompagnement, quel que soit l'état d'avancement de la
        //     validation AMO. Un verdict ÉLIGIBLE, à l'inverse, ne re-décide QUE les
        //     dossiers déjà tranchés : on ne valide jamais à la place de l'AMO un dossier
        //     encore EN_ATTENTE/SANS_AMO. Flip sur vrai changement de verdict seulement
        //     (sinon on écraserait valideeAt). Le mail d'invitation n'est pas renvoyé.
        if (verdict.isNonEligible || decidedStatuts.includes(statutCourant)) {
          const nouveauStatut = verdict.isEligible
            ? StatutValidationAmo.LOGEMENT_ELIGIBLE
            : StatutValidationAmo.LOGEMENT_NON_ELIGIBLE;
          if (nouveauStatut !== statutCourant) {
            await tx
              .update(parcoursAmoValidations)
              .set({ statut: nouveauStatut, valideeAt: now })
              .where(eq(parcoursAmoValidations.id, dossier.validation.id));
            didRefuserNonEligible = verdict.isNonEligible;
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
          // Redevenu éligible → dé-archivage (nettoie archivedAt/reason/by). Cible alignée
          // sur le dé-archivage manuel : ELIGIBLE si un AMO est responsable, PROSPECT sinon.
          await tx
            .update(parcoursPrevention)
            .set({
              situationParticulier: situationApresReactivation(Boolean(dossier.validation.entrepriseAmoId)),
              archivedAt: null,
              archiveReason: null,
              archivedBy: null,
            })
            .where(eq(parcoursPrevention.id, dossier.parcours.id));
        }
      });

      // Audit : trace le refus automatique dans l'historique du dossier (hors transaction,
      // même pattern que reouvrirDemandeAction — best-effort, ne bloque pas la sauvegarde).
      if (didRefuserNonEligible) {
        const snapshot = await buildAuthorSnapshot(agent);
        await parcoursActionsRepo.create({
          parcoursId: dossier.parcours.id,
          agentId: agent.id,
          actionType: ACTION_TYPE_ELIGIBILITE_REFUSEE,
          message: "Accompagnement refusé automatiquement suite à la correction de la simulation (non éligible).",
          authorName: snapshot.authorName,
          authorStructure: snapshot.authorStructure,
          authorStructureType: snapshot.authorStructureType,
        });
      }

      // Invalider le cache de toutes les pages de l'espace agent
      revalidatePath("/espace-agent", "layout");

      return {
        success: true,
        data: { parcoursId: dossier.parcours.id },
      };
    }

    // 4. Fallback : parcours SANS validation AMO (vrai prospect créé par un Aller-vers).
    const [parcours] = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, id)).limit(1);

    if (!parcours) {
      return { success: false, error: "Dossier non trouvé" };
    }

    // Autorisation (sauf admins) — sans garde ici, n'importe quel agent pouvait éditer
    // et archiver un parcours arbitraire via son parcoursId (contournement des gardes
    // d'ownership du chemin validation). Un prospect est par définition « sans AMO ».
    if (!isAdmin) {
      // a. Refuser si une validation existe : l'appelant doit passer par l'id de
      //    validation (et ses gardes ownership/statut), pas contourner via le parcoursId.
      const [existingValidation] = await db
        .select({ id: parcoursAmoValidations.id })
        .from(parcoursAmoValidations)
        .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
        .limit(1);
      if (existingValidation) {
        return { success: false, error: "Ce dossier ne vous est pas destiné" };
      }

      // b. Accès aux dossiers sans AMO réservé aux rôles qui le portent
      //    (ALLERS_VERS / AMO_ET_ALLERS_VERS) — un AMO pur ne voit pas les prospects,
      //    même sur son territoire (verifyProspectTerritoryAccess ne gate pas cette capacité).
      const scope = await calculateAgentScope({
        id: agent.id,
        role: agent.role as UserRole,
        entrepriseAmoId: agent.entrepriseAmoId ?? null,
        allersVersId: agent.allersVersId ?? null,
      });
      if (!scope.canViewDossiersWithoutAmo) {
        return { success: false, error: "Ce dossier ne vous est pas destiné" };
      }

      // c. Territoire (aligné sur le listing prospects).
      const territoryError = await verifyProspectTerritoryAccess(parcours.id, {
        id: agent.id,
        role: agent.role as UserRole,
        entrepriseAmoId: agent.entrepriseAmoId ?? null,
        allersVersId: agent.allersVersId ?? null,
      });
      if (territoryError) {
        return { success: false, error: territoryError };
      }
    }

    // Écriture atomique (simulation + archivage), même exigence de cohérence que le
    // chemin dossier — sinon la simu peut être persistée sans l'archivage promis par l'UI.
    const now = new Date();
    const prospectVerdict = evaluateAgentSimulation(rgaData);
    const prospectWasArchived = Boolean(parcours.archivedAt);
    const prospectArchiveReason = parcours.archiveReason;

    await db.transaction(async (tx) => {
      await tx
        .update(parcoursPrevention)
        .set({
          rgaSimulationDataAgent: rgaData,
          rgaSimulationDataAgentBaseline: computeAgentEditBaseline(parcours),
          rgaSimulationAgentEditedAt: now,
          rgaSimulationAgentEditedBy: agent.id,
        })
        .where(eq(parcoursPrevention.id, parcours.id));

      if (prospectVerdict.isNonEligible && !prospectWasArchived) {
        await tx
          .update(parcoursPrevention)
          .set({
            situationParticulier: SituationParticulier.ARCHIVE,
            archivedAt: now,
            archiveReason: buildEligibiliteArchiveNote(prospectVerdict.result, "edition"),
            archivedBy: agent.id,
          })
          .where(eq(parcoursPrevention.id, parcours.id));
      } else if (
        prospectVerdict.isEligible &&
        prospectWasArchived &&
        isEligibiliteArchiveReason(prospectArchiveReason)
      ) {
        // Prospect (jamais d'AMO responsable) → réactivation en PROSPECT.
        await tx
          .update(parcoursPrevention)
          .set({
            situationParticulier: situationApresReactivation(false),
            archivedAt: null,
            archiveReason: null,
            archivedBy: null,
          })
          .where(eq(parcoursPrevention.id, parcours.id));
      }
    });

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
