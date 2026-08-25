import { and, eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { dossiersDemarchesSimplifiees, ORIGINE_TENTATIVE, parcoursPrevention } from "@/shared/database/schema";
import { dossiersDsTentativesRepo } from "@/shared/database/repositories";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { graphqlClient } from "../adapters/graphql/client";
import { extraireParcoursIdDepuisAnnotations } from "../utils/annotation-fpa.utils";

/**
 * Réconciliation des dossiers DÉPOSÉS avec leur parcours (ADR-0027).
 *
 * Un brouillon est invisible de l'API instructeur : on ne peut rien rapprocher avant le dépôt.
 * Au dépôt en revanche, le dossier devient visible et porte l'annotation « lien FPA », donc le
 * `parcoursId` — quel que soit le compte DN utilisé, l'ordinateur, ou le nombre de brouillons
 * abandonnés en route. C'est ce lien-là qu'on rétablit ici.
 *
 * Par défaut le service n'écrit RIEN : il rend un rapport. L'écriture est explicite (`apply`).
 */

/** Ce que le service décide de faire d'un dossier déposé. */
export type VerdictReconciliation =
  | "rattachement"
  | "deja_a_jour"
  | "conflit_autre_parcours"
  | "conflit_dossier_confirme"
  | "conflit_plusieurs_deposes"
  | "sans_annotation"
  | "parcours_inconnu";

export interface CandidatReconciliation {
  dsNumber: string;
  step: Step;
  state: string;
  parcoursId: string | null;
}

/** État local nécessaire pour trancher, lu en base. */
export interface ContexteRattachement {
  parcoursExiste: boolean;
  /** Pointeur courant de l'étape, s'il existe. */
  pointeurDsNumber: string | null;
  /** Le pointeur a-t-il déjà été observé déposé ? Un simple prérempli ne fait pas foi. */
  pointeurConfirme: boolean;
  /** Parcours auquel ce numéro est déjà rattaché au registre, s'il est connu. */
  parcoursIdDuNumero: string | null;
  /** Plusieurs dossiers déposés portent le même parcoursId sur cette étape. */
  plusieursCandidats: boolean;
}

/**
 * Règle de rattachement, sans effet de bord (cf. tableau de l'ADR-0027).
 * On ne tranche jamais automatiquement un conflit : il remonte pour arbitrage humain.
 */
export function decideRattachement(candidat: CandidatReconciliation, ctx: ContexteRattachement): VerdictReconciliation {
  if (!candidat.parcoursId) return "sans_annotation";
  if (!ctx.parcoursExiste) return "parcours_inconnu";

  // Un numéro n'appartient qu'à un seul parcours : on ne le vole jamais à un autre.
  if (ctx.parcoursIdDuNumero && ctx.parcoursIdDuNumero !== candidat.parcoursId) return "conflit_autre_parcours";

  if (ctx.pointeurDsNumber === candidat.dsNumber) return "deja_a_jour";
  if (ctx.plusieursCandidats) return "conflit_plusieurs_deposes";

  // Le pointeur courant a déjà été observé déposé sous un autre numéro : deux dossiers réels
  // pour une même étape, c'est une décision métier, pas un choix technique.
  if (ctx.pointeurDsNumber && ctx.pointeurConfirme) return "conflit_dossier_confirme";

  return "rattachement";
}

export interface LigneRapport extends CandidatReconciliation {
  verdict: VerdictReconciliation;
  pointeurAvant: string | null;
}

export interface RapportReconciliation {
  lignes: LigneRapport[];
  totaux: Record<VerdictReconciliation, number>;
  rattachementsAppliques: number;
}

function totauxVides(): Record<VerdictReconciliation, number> {
  return {
    rattachement: 0,
    deja_a_jour: 0,
    conflit_autre_parcours: 0,
    conflit_dossier_confirme: 0,
    conflit_plusieurs_deposes: 0,
    sans_annotation: 0,
    parcours_inconnu: 0,
  };
}

/** Pagination complète des dossiers d'une démarche (DN plafonne à 100 par page). */
async function collecterCandidats(
  demarcheNumber: number,
  step: Step,
  updatedSince?: string,
  maxPages = 100
): Promise<CandidatReconciliation[]> {
  const candidats: CandidatReconciliation[] = [];
  let after: string | undefined;
  let pages = 0;

  while (pages < maxPages) {
    pages++;
    const conn = await graphqlClient.getDemarcheDossiers(demarcheNumber, { first: 100, after, updatedSince });
    if (!conn) break;

    for (const node of conn.nodes) {
      candidats.push({
        dsNumber: String(node.number),
        step,
        state: node.state,
        parcoursId: extraireParcoursIdDepuisAnnotations(node.annotations),
      });
    }

    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor ?? undefined;
    if (!after) break;
  }

  return candidats;
}

/** Repointe l'étape vers le dossier réel et remet son état à zéro : la sync le recopiera. */
async function appliquerRattachement(candidat: CandidatReconciliation & { parcoursId: string }): Promise<void> {
  await db.transaction(async (tx) => {
    const [existant] = await tx
      .select({ id: dossiersDemarchesSimplifiees.id, dsDemarcheId: dossiersDemarchesSimplifiees.dsDemarcheId })
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          eq(dossiersDemarchesSimplifiees.parcoursId, candidat.parcoursId),
          eq(dossiersDemarchesSimplifiees.step, candidat.step)
        )
      )
      .limit(1);

    if (existant) {
      await tx
        .update(dossiersDemarchesSimplifiees)
        .set({
          dsNumber: candidat.dsNumber,
          dsId: null,
          dsStatus: null,
          submittedAt: null,
          instructedAt: null,
          processedAt: null,
          lastSyncAt: null,
          dnProbeState: null,
          dnProbeAt: null,
          // Le lien prefill de l'ancienne tentative ne pointe plus vers ce dossier.
          dsUrl: null,
        })
        .where(eq(dossiersDemarchesSimplifiees.id, existant.id));
    }

    await dossiersDsTentativesRepo.record(
      {
        parcoursId: candidat.parcoursId,
        step: candidat.step,
        dsNumber: candidat.dsNumber,
        origine: ORIGINE_TENTATIVE.RECONCILIATION,
        dsDemarcheId: existant?.dsDemarcheId ?? null,
      },
      tx
    );
  });
}

/**
 * Balaye une démarche et rapproche ses dossiers déposés des parcours.
 * `apply = false` (défaut) : aucune écriture, on rend seulement le rapport.
 */
export async function reconcilierDemarche(options: {
  demarcheNumber: number;
  step: Step;
  updatedSince?: string;
  apply?: boolean;
}): Promise<RapportReconciliation> {
  const { demarcheNumber, step, updatedSince, apply = false } = options;

  const candidats = await collecterCandidats(demarcheNumber, step, updatedSince);

  // Un même parcours visé par plusieurs dossiers déposés = conflit, jamais un choix arbitraire.
  const parNombreDeCandidats = new Map<string, number>();
  for (const c of candidats) {
    if (c.parcoursId) parNombreDeCandidats.set(c.parcoursId, (parNombreDeCandidats.get(c.parcoursId) ?? 0) + 1);
  }

  const lignes: LigneRapport[] = [];
  const totaux = totauxVides();
  let rattachementsAppliques = 0;

  for (const candidat of candidats) {
    let ctx: ContexteRattachement = {
      parcoursExiste: false,
      pointeurDsNumber: null,
      pointeurConfirme: false,
      parcoursIdDuNumero: null,
      plusieursCandidats: false,
    };

    if (candidat.parcoursId) {
      const [parcours] = await db
        .select({ id: parcoursPrevention.id })
        .from(parcoursPrevention)
        .where(eq(parcoursPrevention.id, candidat.parcoursId))
        .limit(1);

      const [pointeur] = await db
        .select({
          dsNumber: dossiersDemarchesSimplifiees.dsNumber,
          submittedAt: dossiersDemarchesSimplifiees.submittedAt,
          lastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
        })
        .from(dossiersDemarchesSimplifiees)
        .where(
          and(
            eq(dossiersDemarchesSimplifiees.parcoursId, candidat.parcoursId),
            eq(dossiersDemarchesSimplifiees.step, candidat.step)
          )
        )
        .limit(1);

      const tentative = await dossiersDsTentativesRepo.findByDsNumber(candidat.dsNumber);

      ctx = {
        parcoursExiste: !!parcours,
        pointeurDsNumber: pointeur?.dsNumber ?? null,
        pointeurConfirme: !!(pointeur?.submittedAt || pointeur?.lastSyncAt),
        parcoursIdDuNumero: tentative?.parcoursId ?? null,
        plusieursCandidats: (parNombreDeCandidats.get(candidat.parcoursId) ?? 0) > 1,
      };
    }

    const verdict = decideRattachement(candidat, ctx);
    totaux[verdict] += 1;
    lignes.push({ ...candidat, verdict, pointeurAvant: ctx.pointeurDsNumber });

    if (apply && verdict === "rattachement" && candidat.parcoursId) {
      await appliquerRattachement({ ...candidat, parcoursId: candidat.parcoursId });
      rattachementsAppliques++;
    }
  }

  return { lignes, totaux, rattachementsAppliques };
}
