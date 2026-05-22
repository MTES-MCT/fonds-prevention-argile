import { EligibilityReason } from "../value-objects/eligibility-reason.enum";
import type { RaisonIneligibilite } from "@/features/backoffice/espace-agent/prospects/domain/types/qualification.types";

/**
 * Mappe une `EligibilityReason` (issue du `EligibilityService.evaluate`) vers
 * une `RaisonIneligibilite` acceptée par `prospect_qualifications`.
 *
 * Utilisé par `creation-dossier.service` pour auto-qualifier en NON_ELIGIBLE
 * un dossier dont la simulation agent a échoué.
 */
const MAPPING: Record<EligibilityReason, RaisonIneligibilite> = {
  [EligibilityReason.APPARTEMENT]: "appartement",
  [EligibilityReason.ZONE_NON_FORTE]: "pas_zone_alea_fort",
  [EligibilityReason.DEPARTEMENT_NON_ELIGIBLE]: "hors_zone_perimetre",
  [EligibilityReason.CONSTRUCTION_RECENTE]: "maison_moins_15_ans",
  [EligibilityReason.TROP_DE_NIVEAUX]: "nombre_etages_sup_2",
  [EligibilityReason.MAISON_MITOYENNE]: "maison_mitoyenne",
  [EligibilityReason.REVENUS_TROP_ELEVES]: "hors_plafonds_ressources",
  [EligibilityReason.NON_ASSURE]: "pas_assurance_habitation",
  [EligibilityReason.NON_PROPRIETAIRE_OCCUPANT]: "locataire_non_occupant",
  [EligibilityReason.DEJA_INDEMNISE]: "sinistre_deja_indemnise",
  [EligibilityReason.DEMANDE_CATNAT_EN_COURS]: "autre",
};

export function mapEligibilityReasonToRaisonIneligibilite(
  reason: EligibilityReason | undefined | null
): RaisonIneligibilite {
  if (!reason) return "autre";
  return MAPPING[reason] ?? "autre";
}
