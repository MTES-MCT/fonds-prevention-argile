import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { ProspectQualification } from "@/shared/database/schema/prospect-qualifications";
import type { QualificationDecision } from "../domain/types";

interface QualifyProspectParams {
  parcoursId: string;
  agentId: string;
  decision: QualificationDecision;
  actionsRealisees: string[];
  raisonsIneligibilite?: string[];
  note?: string;
}

/**
 * Service métier pour la qualification des prospects
 */
export class QualificationService {
  /**
   * Qualifie un prospect et met à jour sa situation_particulier
   *
   * - "eligible" → situation_particulier passe à ELIGIBLE
   * - "non_eligible" → situation_particulier passe à ARCHIVE
   * - "a_qualifier" → pas de changement de situation_particulier
   */
  async qualifyProspect(params: QualifyProspectParams): Promise<ProspectQualification> {
    const { parcoursId, agentId, decision, actionsRealisees, raisonsIneligibilite, note } = params;

    // 1. Vérifier que le parcours existe
    const parcours = await parcoursPreventionRepository.findById(parcoursId);
    if (!parcours) {
      throw new Error("Parcours non trouvé");
    }

    // 2. Créer l'enregistrement de qualification
    const qualification = await prospectQualificationsRepo.create({
      parcoursId,
      agentId,
      decision,
      actionsRealisees,
      raisonsIneligibilite: raisonsIneligibilite ?? null,
      note: note ?? null,
    });

    // 3. Mettre à jour situation_particulier selon la décision
    if (decision === "eligible") {
      await parcoursPreventionRepository.updateSituationParticulier(
        parcoursId,
        SituationParticulier.ELIGIBLE,
      );
    } else if (decision === "non_eligible") {
      await parcoursPreventionRepository.updateSituationParticulier(
        parcoursId,
        SituationParticulier.ARCHIVE,
        "Non éligible au dispositif",
      );
    }
    // "a_qualifier" → pas de changement de situation_particulier

    return qualification;
  }

  /**
   * Récupère la dernière qualification d'un parcours
   */
  async getLatestQualification(parcoursId: string): Promise<ProspectQualification | null> {
    return prospectQualificationsRepo.findLatestByParcoursId(parcoursId);
  }

  /**
   * Récupère l'historique des qualifications d'un parcours (plus récente en premier)
   */
  async getQualificationHistory(parcoursId: string): Promise<ProspectQualification[]> {
    return prospectQualificationsRepo.findByParcoursId(parcoursId);
  }
}

// Instance singleton
export const qualificationService = new QualificationService();
