"use server";

import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import type { PartialVulnerabiliteReponses } from "../domain/types/vulnerabilite-reponses.types";
import type { VulnerabiliteScoreResult } from "../domain/services/scoring.service";

/**
 * Enregistre une simulation de vulnérabilité terminée, de façon strictement anonyme
 * (aucune session, aucune donnée nominative — page publique sans authentification).
 * Best-effort : appelé en fire-and-forget par `VulnerabiliteFormulaire`, une erreur ici
 * ne doit jamais empêcher l'affichage du résultat à l'utilisateur.
 */
export async function enregistrerResultatVulnerabiliteAction(
  answers: PartialVulnerabiliteReponses,
  scoreResult: VulnerabiliteScoreResult
): Promise<void> {
  try {
    await vulnerabiliteSimulationsRepo.create({
      codeDepartement: answers.adresse?.codeDepartement ?? null,
      aleaRga: answers.adresse?.aleaRga ?? null,
      penteTerrain: answers.eaux?.pente_terrain ?? null,
      reseauxEnterres: answers.eaux?.reseaux_enterres ?? null,
      gravierProprete: answers.eaux?.gravier_proprete ?? null,
      gouttieres: answers.eaux?.gouttieres ?? null,
      arbreProximite: answers.vegetation?.arbre_proximite ?? null,
      arbreEssence: answers.vegetation?.arbre_essence ?? null,
      haies: answers.vegetation?.haies ?? null,
      vegetationPiedFacade: answers.vegetation?.vegetation_pied_facade ?? null,
      mitoyennete: answers.divers?.mitoyennete ?? null,
      ensoleillement: answers.divers?.ensoleillement ?? null,
      scoreGlobal: scoreResult.scoreGlobal,
      scoreParCategorie: scoreResult.scoreParCategorie,
    });
  } catch (error) {
    console.error("[enregistrerResultatVulnerabiliteAction] échec de l'enregistrement (best-effort)", error);
  }
}
