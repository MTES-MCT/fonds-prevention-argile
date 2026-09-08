"use server";

import { cookies } from "next/headers";
import { vulnerabiliteSimulationsRepo, parcoursRepo } from "@/shared/database/repositories";
import { getSession, COOKIE_NAMES, getCookieOptions, SESSION_DURATION } from "@/features/auth/server";
import { vulnerabiliteSimulationPayloadSchema } from "../domain/value-objects/simulation-payload";
import { isVulnerabiliteRgaActive } from "../domain/value-objects/vulnerabilite-disponibilite";
import { computeScoreFromReponses } from "../domain/services/scoring.service";

/**
 * Enregistre une simulation de vulnérabilité terminée, de façon strictement anonyme
 * (aucune session requise — page publique sans authentification).
 * Best-effort : appelé en fire-and-forget par `VulnerabiliteFormulaire`, une erreur ici
 * ne doit jamais empêcher l'affichage du résultat à l'utilisateur.
 *
 * Endpoint public : la charge utile est validée contre la grille de pondération et le score
 * est **recalculé côté serveur**, jamais accepté du client (cf. `simulation-payload.ts`).
 *
 * Si un demandeur est déjà connecté au moment de la simulation, le pointeur
 * `parcours_prevention.vulnerabilite_simulation_id` est posé immédiatement. Sinon, un cookie
 * httpOnly porte l'UUID de la ligne créée pour un rattrapage si la connexion intervient plus
 * tard dans la même session (`lierSimulationVulnerabiliteAnonyme` dans le callback FranceConnect,
 * mirror de `FC_CLAIM_TOKEN`).
 */
export async function enregistrerResultatVulnerabiliteAction(payload: unknown): Promise<void> {
  // Une Server Action reste appelable même quand la page qui l'utilise renvoie 404.
  if (!isVulnerabiliteRgaActive()) return;

  const parsed = vulnerabiliteSimulationPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    // Jamais le contenu du payload dans les logs.
    console.warn("[enregistrerResultatVulnerabiliteAction] charge utile invalide, simulation ignorée");
    return;
  }

  const { codeDepartement, reponses } = parsed.data;

  try {
    const scoreResult = computeScoreFromReponses(reponses);

    const simulation = await vulnerabiliteSimulationsRepo.create({
      codeDepartement,
      aleaRga: reponses.aleaRga ?? null,
      penteTerrain: reponses.pente_terrain ?? null,
      reseauxEnterres: reponses.reseaux_enterres ?? null,
      gravierProprete: reponses.gravier_proprete ?? null,
      gouttieres: reponses.gouttieres ?? null,
      arbreProximite: reponses.arbre_proximite ?? null,
      arbreEssence: reponses.arbre_essence ?? null,
      haies: reponses.haies ?? null,
      vegetationPiedFacade: reponses.vegetation_pied_facade ?? null,
      mitoyennete: reponses.mitoyennete ?? null,
      ensoleillement: reponses.ensoleillement ?? null,
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
