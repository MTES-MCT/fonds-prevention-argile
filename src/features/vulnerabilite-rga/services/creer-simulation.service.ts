import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import type { VulnerabiliteSimulationPayload } from "../domain/value-objects/simulation-payload";

/** Écrit la ligne anonyme d'une simulation validée : une colonne par critère répondu. */
export async function creerSimulationVulnerabilite({ codeDepartement, reponses }: VulnerabiliteSimulationPayload) {
  return vulnerabiliteSimulationsRepo.create({
    codeDepartement,
    aleaRga: reponses.aleaRga ?? null,
    penteTerrain: reponses.pente_terrain ?? null,
    reseauxEnterres: reponses.reseaux_enterres ?? null,
    gravierProprete: reponses.gravier_proprete ?? null,
    gouttieres: reponses.gouttieres ?? null,
    recuperateurEau: reponses.recuperateur_eau ?? null,
    arbreProximite: reponses.arbre_proximite ?? null,
    arbreEssence: reponses.arbre_essence ?? null,
    haies: reponses.haies ?? null,
    vegetationPiedFacade: reponses.vegetation_pied_facade ?? null,
    mitoyennete: reponses.mitoyennete ?? null,
    ensoleillement: reponses.ensoleillement ?? null,
  });
}
