import {
  checkDepartementEligible,
  checkNonMitoyen,
  checkZoneForte,
} from "@/features/simulateur/domain/rules/eligibility";
import type { PartialVulnerabiliteReponses, ReponseAleaRga } from "../types/vulnerabilite-reponses.types";

interface ElementsEligibiliteFonds {
  codeDepartement?: string | null;
  aleaRga?: ReponseAleaRga;
  mitoyennete?: string;
}

/**
 * Le logement remplit-il les critères d'éligibilité au fonds que ce simulateur connaît
 * (département, aléa fort, maison non mitoyenne) ? Les règles sont celles du simulateur
 * d'éligibilité, jamais recodées ici.
 */
export function remplitCriteresEligibiliteFondsDepuis({
  codeDepartement,
  aleaRga,
  mitoyennete,
}: ElementsEligibiliteFonds): boolean {
  const mitoyen = mitoyennete === undefined ? undefined : mitoyennete !== "pas_mitoyen";

  return (
    checkDepartementEligible(codeDepartement ?? undefined).passed &&
    checkZoneForte(aleaRga).passed &&
    checkNonMitoyen(mitoyen).passed
  );
}

export function remplitCriteresEligibiliteFonds(answers: PartialVulnerabiliteReponses): boolean {
  return remplitCriteresEligibiliteFondsDepuis({
    codeDepartement: answers.adresse?.codeDepartement,
    aleaRga: answers.adresse?.aleaRga,
    mitoyennete: answers.divers?.mitoyennete,
  });
}
