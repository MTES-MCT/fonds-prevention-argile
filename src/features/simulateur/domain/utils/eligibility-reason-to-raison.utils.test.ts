import { describe, it, expect } from "vitest";
import { mapEligibilityReasonToRaisonIneligibilite } from "./eligibility-reason-to-raison.utils";
import { EligibilityReason } from "../value-objects/eligibility-reason.enum";

describe("mapEligibilityReasonToRaisonIneligibilite", () => {
  it.each([
    [EligibilityReason.APPARTEMENT, "appartement"],
    [EligibilityReason.ZONE_NON_FORTE, "pas_zone_alea_fort"],
    [EligibilityReason.DEPARTEMENT_NON_ELIGIBLE, "hors_zone_perimetre"],
    [EligibilityReason.CONSTRUCTION_RECENTE, "maison_moins_15_ans"],
    [EligibilityReason.TROP_DE_NIVEAUX, "nombre_etages_sup_2"],
    [EligibilityReason.MAISON_MITOYENNE, "maison_mitoyenne"],
    [EligibilityReason.REVENUS_TROP_ELEVES, "hors_plafonds_ressources"],
    [EligibilityReason.NON_ASSURE, "pas_assurance_habitation"],
    [EligibilityReason.NON_PROPRIETAIRE_OCCUPANT, "locataire_non_occupant"],
    [EligibilityReason.DEJA_INDEMNISE, "sinistre_deja_indemnise"],
    [EligibilityReason.DEMANDE_CATNAT_EN_COURS, "autre"],
  ])("mappe %s → %s", (reason, expected) => {
    expect(mapEligibilityReasonToRaisonIneligibilite(reason)).toBe(expected);
  });

  it("retourne 'autre' si la raison est null ou undefined", () => {
    expect(mapEligibilityReasonToRaisonIneligibilite(null)).toBe("autre");
    expect(mapEligibilityReasonToRaisonIneligibilite(undefined)).toBe("autre");
  });
});
