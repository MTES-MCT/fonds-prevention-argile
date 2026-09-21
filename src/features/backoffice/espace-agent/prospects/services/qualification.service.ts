import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { ProspectQualification } from "@/shared/database/schema/prospect-qualifications";
import { RAISON_ARCHIVAGE_NON_ELIGIBLE } from "@/features/simulateur/domain/services/eligibilite-archivage.service";
import type { AccompagnementSouhaite } from "@/shared/domain/value-objects/accompagnement-souhaite.enum";
import { QualificationDecision } from "../domain/types";
import { ACTION_TYPE_BY_DECISION, buildQualificationAuditMessage } from "../domain/qualification-audit";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import {
  donnerSuiteAQualificationEligible,
  libelleSuiteAccompagnement,
  type ContexteAgentQualification,
  type SuiteAccompagnement,
} from "./suite-qualification.service";

export interface QualifyProspectResult {
  qualification: ProspectQualification;
  /** Suite donnée à l'accompagnement. `null` = sans objet (décision autre qu'éligible). */
  suiteAccompagnement: SuiteAccompagnement;
}

interface QualifyProspectParams {
  parcoursId: string;
  agentId: string;
  decision: QualificationDecision;
  actionsRealisees?: string[];
  raisonsIneligibilite?: string[];
  estMandataireFinancier?: boolean;
  /** Réponse du demandeur recueillie par l'agent (départements sans AMO imposé). */
  accompagnementSouhaite?: AccompagnementSouhaite;
  note?: string;
  /**
   * Casquettes de l'agent, pour décider si sa qualification vaut validation AMO. Absent
   * quand l'appelant n'est pas une action d'agent (création de dossier non éligible).
   */
  contexteAgent?: Omit<ContexteAgentQualification, "agentId">;
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
  async qualifyProspect(params: QualifyProspectParams): Promise<QualifyProspectResult> {
    const {
      parcoursId,
      agentId,
      decision,
      actionsRealisees,
      raisonsIneligibilite,
      estMandataireFinancier,
      accompagnementSouhaite,
      note,
      contexteAgent,
    } = params;

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
      actionsRealisees: actionsRealisees ?? [],
      raisonsIneligibilite: raisonsIneligibilite ?? null,
      estMandataireFinancier: estMandataireFinancier ?? null,
      accompagnementSouhaite: accompagnementSouhaite ?? null,
      note: note ?? null,
    });

    // 3. Mettre à jour situation_particulier selon la décision
    let suiteAccompagnement: SuiteAccompagnement = null;
    if (decision === QualificationDecision.ELIGIBLE) {
      await parcoursPreventionRepository.updateSituationParticulier(parcoursId, SituationParticulier.ELIGIBLE);
      // La qualification de l'Aller-vers met le dossier en relation avec l'AMO, sans
      // attendre que le ménage redemande ce qu'il vient de dire à l'agent.
      suiteAccompagnement = await donnerSuiteAQualificationEligible(
        parcours,
        { agentId, ...(contexteAgent ?? { entrepriseAmoId: null, aLaCapaciteAmo: false }) },
        accompagnementSouhaite,
        estMandataireFinancier
      );
    } else if (decision === QualificationDecision.NON_ELIGIBLE) {
      await parcoursPreventionRepository.updateSituationParticulier(
        parcoursId,
        SituationParticulier.ARCHIVE,
        RAISON_ARCHIVAGE_NON_ELIGIBLE,
        agentId
      );
    }
    // "a_qualifier" → pas de changement de situation_particulier

    // Audit : la réponse de l'Aller-vers doit apparaître dans l'historique du dossier,
    // sinon le délai de réponse n'est mesurable nulle part. Ici (service) et non dans la
    // server action, pour couvrir aussi la création de dossier AV non éligible.
    // Une décision « non éligible » archive le dossier : pas de `dossier_archive` en plus,
    // la qualification porte déjà l'information.
    // La suite donnée à l'accompagnement enrichit cette trace au lieu d'en créer une seconde :
    // un seul geste de l'agent doit rester une seule ligne d'historique (§2.9 FLOW-AND-SYNC.md).
    const messageQualification = buildQualificationAuditMessage({
      decision,
      raisonsIneligibilite,
      estMandataireFinancier,
      note,
    });
    const messageSuite = libelleSuiteAccompagnement(suiteAccompagnement);

    await logSystemAction({
      parcoursId,
      author: { agentId },
      actionType: ACTION_TYPE_BY_DECISION[decision],
      message: [messageQualification, messageSuite].filter(Boolean).join(" ") || null,
    });

    return { qualification, suiteAccompagnement };
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
