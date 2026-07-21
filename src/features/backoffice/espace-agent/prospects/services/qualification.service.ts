import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { ProspectQualification } from "@/shared/database/schema/prospect-qualifications";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { assignAmoAutomatiqueForUser } from "@/features/parcours/amo/services/amo-selection.service";
import { isAmoAttributionAutomatique } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";
import { QualificationDecision } from "../domain/types";

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
  async qualifyProspect(params: QualifyProspectParams): Promise<ProspectQualification> {
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
    if (decision === QualificationDecision.ELIGIBLE) {
      await parcoursPreventionRepository.updateSituationParticulier(parcoursId, SituationParticulier.ELIGIBLE);
      // En département à AMO obligatoire (ou AV/AMO fusionnés), la validation de
      // l'Aller-vers met directement le dossier en lien avec l'AMO unique du
      // territoire — sans attendre que le ménage fasse sa demande d'accompagnement.
      await this.autoLinkAmoIfObligatoire(parcours);
    } else if (decision === QualificationDecision.NON_ELIGIBLE) {
      await parcoursPreventionRepository.updateSituationParticulier(
        parcoursId,
        SituationParticulier.ARCHIVE,
        "Non éligible au dispositif",
        agentId
      );
    }
    // "a_qualifier" → pas de changement de situation_particulier

    return qualification;
  }

  /**
   * Met le dossier en lien direct avec l'AMO du territoire si le département impose
   * un AMO (obligatoire / AV-AMO fusionnés). Best-effort : `assignAmoAutomatiqueForUser`
   * est idempotent (no-op success si une validation existe déjà) et gardé à l'étape
   * choix_amo (renvoie success:false sinon) — cet échec est ignoré (loggé) et ne doit
   * jamais faire échouer la qualification déjà enregistrée.
   */
  private async autoLinkAmoIfObligatoire(
    parcours: NonNullable<Awaited<ReturnType<typeof parcoursPreventionRepository.findById>>>
  ): Promise<void> {
    try {
      const codeInsee = normalizeCodeInsee(getDemandeurFirstLogement(parcours)?.commune);
      if (!codeInsee) return;
      if (!isAmoAttributionAutomatique(getCodeDepartementFromCodeInsee(codeInsee))) return;

      const result = await assignAmoAutomatiqueForUser(parcours.userId);
      if (!result.success) {
        console.warn(`[qualifyProspect] auto-lien AMO non appliqué (parcours ${parcours.id}): ${result.error}`);
      }
    } catch (error) {
      console.error(`[qualifyProspect] échec auto-lien AMO (parcours ${parcours.id}):`, error);
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
