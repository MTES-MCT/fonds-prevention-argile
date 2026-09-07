"use server";

import { cookies } from "next/headers";
import { vulnerabiliteSimulationsRepo, parcoursRepo } from "@/shared/database/repositories";
import { getSession, COOKIE_NAMES, getCookieOptions, SESSION_DURATION } from "@/features/auth/server";
import type { PartialVulnerabiliteReponses } from "../domain/types/vulnerabilite-reponses.types";
import type { VulnerabiliteScoreResult } from "../domain/services/scoring.service";

/**
 * Enregistre une simulation de vulnérabilité terminée, de façon strictement anonyme
 * (aucune session requise — page publique sans authentification).
 * Best-effort : appelé en fire-and-forget par `VulnerabiliteFormulaire`, une erreur ici
 * ne doit jamais empêcher l'affichage du résultat à l'utilisateur.
 *
 * Si un demandeur est déjà connecté au moment de la simulation, le pointeur
 * `parcours_prevention.vulnerabilite_simulation_id` est posé immédiatement. Sinon, un cookie
 * httpOnly porte l'UUID de la ligne créée pour un rattrapage si la connexion intervient plus
 * tard dans la même session (`lierSimulationVulnerabiliteAuCompte`, mirror de `FC_CLAIM_TOKEN`).
 */
export async function enregistrerResultatVulnerabiliteAction(
  answers: PartialVulnerabiliteReponses,
  scoreResult: VulnerabiliteScoreResult
): Promise<void> {
  try {
    const simulation = await vulnerabiliteSimulationsRepo.create({
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

    const session = await getSession();
    if (session?.userId) {
      const parcours = await parcoursRepo.findByUserId(session.userId);
      if (parcours) {
        await parcoursRepo.update(parcours.id, { vulnerabiliteSimulationId: simulation.id });
      }
    } else {
      const cookieStore = await cookies();
      cookieStore.set(
        COOKIE_NAMES.VULNERABILITE_SIMULATION_ID,
        simulation.id,
        getCookieOptions(SESSION_DURATION.vulnerabiliteSimulationLink)
      );
    }
  } catch (error) {
    console.error("[enregistrerResultatVulnerabiliteAction] échec de l'enregistrement (best-effort)", error);
  }
}
