import { db } from "@/shared/database/client";
import { eq } from "drizzle-orm";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { parcoursRepo, prospectQualificationsRepo, dossierDsRepo } from "@/shared/database/repositories";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";
import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import {
  SituationParticulier,
  situationApresReactivation,
} from "@/shared/domain/value-objects/situation-particulier.enum";
import {
  evaluateSimulation,
  buildEligibiliteArchiveNote,
  isEligibiliteArchiveReason,
  RAISON_ARCHIVAGE_NON_ELIGIBLE,
} from "@/features/simulateur/domain/services/eligibilite-archivage.service";
import { mapEligibilityReasonToRaisonIneligibilite } from "@/features/simulateur/domain/utils/eligibility-reason-to-raison.utils";
import { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import {
  ACTION_TYPE_SIMULATION_NON_ELIGIBLE,
  ACTION_TYPE_DOSSIER_DESARCHIVE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";

export interface VerdictSimulationDemandeur {
  archived: boolean;
  unarchived: boolean;
}

const AUCUN_CHANGEMENT: VerdictSimulationDemandeur = { archived: false, unarchived: false };

/**
 * Applique le verdict d'éligibilité de la simulation que le demandeur vient
 * d'enregistrer : archivage si elle est non éligible, dé-archivage si elle
 * redevient éligible.
 *
 * Miroir demandeur de `updateSimulationDataAction` (correction agent), avec deux
 * différences assumées :
 *  - aucune décision de validation AMO n'est prise ici (c'est le rôle de l'AMO /
 *    de l'Aller-vers) — on ne fait qu'archiver, sur la base des seules réponses ;
 *  - la qualification écrite n'a pas d'agent (`agentId: null`) : elle sert à
 *    catégoriser le dossier et à alimenter les stats d'inéligibilité, exactement
 *    comme celle d'un Aller-vers.
 */
export async function appliquerVerdictSimulationDemandeur(params: {
  parcours: ParcoursPrevention;
  rgaData: RGASimulationData | PartialRGASimulationData;
  demandeurNom: string;
}): Promise<VerdictSimulationDemandeur> {
  const { parcours, rgaData, demandeurNom } = params;

  const verdict = evaluateSimulation(rgaData);
  if (!verdict.isEligible && !verdict.isNonEligible) return AUCUN_CHANGEMENT;

  // Le simulateur reste accessible en cours de parcours : une fois un formulaire DN
  // déposé, l'état du dossier appartient à la DDT et aux professionnels, pas à une
  // nouvelle simulation.
  const dossiersDeposes = await dossierDsRepo.getSubmittedDatesByStep(parcours.id);
  if (dossiersDeposes.size > 0) return AUCUN_CHANGEMENT;

  const estArchive = Boolean(parcours.archivedAt);

  if (verdict.isNonEligible) {
    if (estArchive) return AUCUN_CHANGEMENT;

    const note = buildEligibiliteArchiveNote(verdict.result, "demandeur");

    await prospectQualificationsRepo.create({
      parcoursId: parcours.id,
      agentId: null,
      decision: QualificationDecision.NON_ELIGIBLE,
      actionsRealisees: [],
      raisonsIneligibilite: [mapEligibilityReasonToRaisonIneligibilite(verdict.result?.reason)],
      note,
    });

    // Raison canonique (et non la note détaillée) : les stats « demandes inéligibles »
    // filtrent dessus à l'exact.
    await parcoursRepo.updateSituationParticulier(
      parcours.id,
      SituationParticulier.ARCHIVE,
      RAISON_ARCHIVAGE_NON_ELIGIBLE
    );

    await logSystemAction({
      parcoursId: parcours.id,
      author: { demandeur: { nom: demandeurNom } },
      actionType: ACTION_TYPE_SIMULATION_NON_ELIGIBLE,
      message: note,
    });

    return { archived: true, unarchived: false };
  }

  // Redevenu éligible : on ne défait qu'un archivage pour inéligibilité, jamais un
  // archivage manuel (abandon, non-réponse, reste à charge…).
  if (!estArchive || !isEligibiliteArchiveReason(parcours.archiveReason)) return AUCUN_CHANGEMENT;

  const [validation] = await db
    .select({ entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
    .limit(1);

  await parcoursRepo.updateSituationParticulier(
    parcours.id,
    situationApresReactivation(Boolean(validation?.entrepriseAmoId))
  );

  await logSystemAction({
    parcoursId: parcours.id,
    author: { demandeur: { nom: demandeurNom } },
    actionType: ACTION_TYPE_DOSSIER_DESARCHIVE,
    message: "Dé-archivé automatiquement : la nouvelle simulation du demandeur est éligible.",
  });

  return { archived: false, unarchived: true };
}
