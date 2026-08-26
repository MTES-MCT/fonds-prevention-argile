import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { dossiersDemarchesSimplifiees, ORIGINE_TENTATIVE } from "@/shared/database/schema";
import { dossiersDsTentativesRepo, parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";
import { graphqlClient, DsGraphQLError } from "../adapters/graphql/client";
import { getDossierByStep } from "./dossier-ds.service";

/**
 * Secours du demandeur dont le lien DN ne fonctionne plus (ADR-0027).
 *
 * On ne sait pas si son brouillon est mort : DN masque les brouillons à l'API instructeur. On
 * ne cherche donc pas à le diagnostiquer, on lui rend la main — après avoir vérifié qu'aucun
 * de ses numéros connus n'a été déposé entre-temps, auquel cas il faut rattacher, pas recréer.
 *
 * Retirer le pointeur ne perd plus rien : le numéro reste au registre des tentatives, et la
 * réconciliation le retrouvera s'il finit par être déposé.
 */

/** Fenêtre anti-rafale : évite qu'un double-clic n'empile les brouillons côté DN. */
export const DELAI_MIN_REGENERATION_MINUTES = 10;

export type RefusRegeneration = "aucun_dossier" | "dossier_depose" | "trop_recent" | "verification_impossible";

interface DossierPourRegeneration {
  createdAt: Date;
  submittedAt: Date | null;
  lastSyncAt: Date | null;
  dsStatus: string | null;
}

/**
 * Peut-on régénérer ? Sans effet de bord.
 * On refuse sur un dossier déjà déposé : son lien est valide, c'est l'URL stable qui s'applique.
 */
export function verifierRegeneration(
  dossier: DossierPourRegeneration | null,
  maintenant: Date
): RefusRegeneration | null {
  if (!dossier) return "aucun_dossier";
  if (dossier.submittedAt || dossier.lastSyncAt || dossier.dsStatus) return "dossier_depose";

  const minutes = (maintenant.getTime() - dossier.createdAt.getTime()) / 60_000;
  if (minutes < DELAI_MIN_REGENERATION_MINUTES) return "trop_recent";

  return null;
}

const MESSAGES: Record<RefusRegeneration, string> = {
  aucun_dossier: "Aucun formulaire à régénérer pour cette étape.",
  dossier_depose: "Votre dossier a déjà été transmis : votre lien pointe vers le dossier déposé.",
  trop_recent: "Votre lien vient d'être créé. Essayez d'abord de l'ouvrir, puis réessayez dans quelques minutes.",
  verification_impossible:
    "Nous n'arrivons pas à joindre Démarches Numériques pour le moment. Réessayez dans quelques minutes.",
};

export type ResultatRegeneration =
  /** Un numéro déjà connu a été déposé entre-temps : on rattache au lieu de recréer. */
  | { statut: "rattache"; dsNumber: string }
  /** Le pointeur a été retiré : l'app peut créer un nouveau prérempli. */
  | { statut: "a_recreer" };

/** Repointe l'étape vers un dossier réellement déposé et remet l'état à zéro pour la sync. */
async function rattacher(dossierId: string, dsNumber: string): Promise<void> {
  await db
    .update(dossiersDemarchesSimplifiees)
    .set({
      dsNumber,
      dsId: null,
      dsStatus: null,
      submittedAt: null,
      instructedAt: null,
      processedAt: null,
      lastSyncAt: null,
      dnProbeState: null,
      dnProbeAt: null,
      dsUrl: null,
    })
    .where(eq(dossiersDemarchesSimplifiees.id, dossierId));
}

export async function regenererLienPrefill(userId: string): Promise<ActionResult<ResultatRegeneration>> {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) return { success: false, error: "Parcours non trouvé" };

  const step = parcours.currentStep;
  const dossier = await getDossierByStep(parcours.id, step);

  const refus = verifierRegeneration(dossier, new Date());
  if (refus) return { success: false, error: MESSAGES[refus] };
  if (!dossier?.dsNumber) return { success: false, error: MESSAGES.aucun_dossier };

  // Le numéro courant doit être au registre AVANT qu'on retire le pointeur.
  await dossiersDsTentativesRepo.record({
    parcoursId: parcours.id,
    step,
    dsNumber: dossier.dsNumber,
    origine: ORIGINE_TENTATIVE.PREFILL,
    dsId: dossier.dsId,
    dsDemarcheId: dossier.dsDemarcheId,
  });

  // Un ancien brouillon a-t-il été déposé depuis ? Alors il n'y a rien à recréer.
  const tentatives = await dossiersDsTentativesRepo.findByParcoursStep(parcours.id, step);
  for (const tentative of tentatives) {
    try {
      const dn = await graphqlClient.getDossierStatus(Number(tentative.dsNumber));
      if (dn) {
        await rattacher(dossier.id, tentative.dsNumber);
        return { success: true, data: { statut: "rattache", dsNumber: tentative.dsNumber } };
      }
    } catch (error) {
      // SEUL un `not_found` typé signifie « invisible de l'API instructeur », donc non déposé.
      // Toute autre erreur (réseau, unauthorized, 500) nous laisse aveugles : on s'arrête là
      // plutôt que de retirer un pointeur peut-être vivant.
      const code = error instanceof DsGraphQLError ? error.code : undefined;
      if (code !== "not_found") {
        console.error("regenererLienPrefill : sondage DN impossible", { dsNumber: tentative.dsNumber, code });
        return { success: false, error: MESSAGES.verification_impossible };
      }
    }
  }

  // Le pointeur part, le numéro reste au registre : la réconciliation le rattrapera si l'usager
  // finit par déposer l'ancien brouillon.
  //
  // Compare-and-swap : entre le sondage et ici, une sync ou une réconciliation a pu confirmer
  // ou repointer cette ligne. On ne supprime donc que si elle porte TOUJOURS le même numéro et
  // n'a toujours pas été observée déposée.
  const supprimes = await db
    .delete(dossiersDemarchesSimplifiees)
    .where(
      and(
        eq(dossiersDemarchesSimplifiees.id, dossier.id),
        eq(dossiersDemarchesSimplifiees.dsNumber, dossier.dsNumber),
        isNull(dossiersDemarchesSimplifiees.submittedAt),
        isNull(dossiersDemarchesSimplifiees.lastSyncAt)
      )
    )
    .returning({ id: dossiersDemarchesSimplifiees.id });

  if (supprimes.length === 0) {
    // La ligne a bougé sous nos pieds : elle est désormais rattachée à un dossier réel.
    return { success: false, error: MESSAGES.dossier_depose };
  }

  return { success: true, data: { statut: "a_recreer" } };
}
