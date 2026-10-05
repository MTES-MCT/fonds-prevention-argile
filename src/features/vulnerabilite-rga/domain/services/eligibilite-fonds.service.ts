import {
  checkDepartementEligible,
  checkNonMitoyen,
  checkZoneForte,
} from "@/features/simulateur/domain/rules/eligibility";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

/**
 * Le logement remplit-il les critères d'éligibilité au fonds que ce simulateur connaît
 * (département, aléa fort, maison non mitoyenne) ? Les règles sont celles du simulateur
 * d'éligibilité, jamais recodées ici.
 */
export function remplitCriteresEligibiliteFonds(answers: PartialVulnerabiliteReponses): boolean {
  const mitoyennete = answers.divers?.mitoyennete;
  const mitoyen = mitoyennete === undefined ? undefined : mitoyennete !== "pas_mitoyen";

  return (
    checkDepartementEligible(answers.adresse?.codeDepartement ?? undefined).passed &&
    checkZoneForte(answers.adresse?.aleaRga).passed &&
    checkNonMitoyen(mitoyen).passed
  );
}
