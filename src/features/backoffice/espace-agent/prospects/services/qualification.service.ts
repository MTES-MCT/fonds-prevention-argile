import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { ProspectQualification } from "@/shared/database/schema/prospect-qualifications";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { assignAmoAutomatiqueForUser } from "@/features/parcours/amo/services/amo-selection.service";
import { estAmoObligatoire } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";
import { RAISON_ARCHIVAGE_NON_ELIGIBLE } from "@/features/simulateur/domain/services/eligibilite-archivage.service";
import { QualificationDecision } from "../domain/types";
import { ACTION_TYPE_BY_DECISION, buildQualificationAuditMessage } from "../domain/qualification-audit";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";

/**
 * Verdict de la transmission à l'AMO. `null` = sans objet (décision non éligible, ou
 * département où le ménage choisit lui-même son accompagnement).
 */
export type TransmissionAmo = { transmise: boolean; raison: string } | null;

export interface QualifyProspectResult {
  qualification: ProspectQualification;
  transmissionAmo: TransmissionAmo;
}

interface QualifyProspectParams {
  parcoursId: string;
  agentId: string;
  decision: QualificationDecision;
  actionsRealisees?: string[];
  raisonsIneligibilite?: string[];
  estMandataireFinancier?: boolean;
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
  async qualifyProspect(params: QualifyProspectParams): Promise<QualifyProspectResult> {
    const { parcoursId, agentId, decision, actionsRealisees, raisonsIneligibilite, estMandataireFinancier, note } =
      params;

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
      note: note ?? null,
    });

    // 3. Mettre à jour situation_particulier selon la décision
    let transmissionAmo: TransmissionAmo = null;
    if (decision === QualificationDecision.ELIGIBLE) {
      await parcoursPreventionRepository.updateSituationParticulier(parcoursId, SituationParticulier.ELIGIBLE);
      // Là où l'AMO est imposé, la validation de l'Aller-vers met directement le dossier
      // en lien avec l'AMO du territoire, sans attendre la demande du ménage.
      transmissionAmo = await this.autoLinkAmoIfObligatoire(parcours);
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
    await logSystemAction({
      parcoursId,
      author: { agentId },
      actionType: ACTION_TYPE_BY_DECISION[decision],
      message: buildQualificationAuditMessage({ decision, raisonsIneligibilite, estMandataireFinancier, note }),
    });

    return { qualification, transmissionAmo };
  }

  /**
   * Met le dossier en lien direct avec l'AMO du territoire si le département impose un AMO.
   *
   * Best-effort sur la mutation (un échec ne fait jamais échouer la qualification déjà
   * enregistrée) mais **pas silencieux** : le verdict remonte à l'agent, qui croyait sinon
   * avoir passé la main alors que rien n'était parti vers l'AMO.
   */
  private async autoLinkAmoIfObligatoire(
    parcours: NonNullable<Awaited<ReturnType<typeof parcoursPreventionRepository.findById>>>
  ): Promise<TransmissionAmo> {
    try {
      const codeInsee = normalizeCodeInsee(getDemandeurFirstLogement(parcours)?.commune);
      if (!codeInsee) {
        return { transmise: false, raison: "Commune du logement inconnue : AMO non sollicitée." };
      }
      if (!estAmoObligatoire(getCodeDepartementFromCodeInsee(codeInsee))) return null;

      const result = await assignAmoAutomatiqueForUser(parcours.userId);
      if (!result.success) {
        console.warn(`[qualifyProspect] auto-lien AMO non appliqué (parcours ${parcours.id}): ${result.error}`);
        return { transmise: false, raison: result.error };
      }
      return { transmise: true, raison: result.data.message };
    } catch (error) {
      console.error(`[qualifyProspect] échec auto-lien AMO (parcours ${parcours.id}):`, error);
      return { transmise: false, raison: "Erreur technique lors de la transmission à l'AMO." };
    }
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
