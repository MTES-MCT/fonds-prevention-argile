import { and, eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  dossiersDemarchesSimplifiees,
  ORIGINE_TENTATIVE,
  parcoursPrevention,
  type OrigineTentative,
} from "@/shared/database/schema";
import { dossiersDsTentativesRepo } from "@/shared/database/repositories";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { ActionResult } from "@/shared/types";
import { graphqlClient } from "../adapters/graphql/client";
import { lireAnnotationFpa } from "../utils/annotation-fpa.utils";
import { getAnnotationLienFpaId } from "../domain/value-objects/ds-annotations";
import { resolveDemarcheNumberForStep } from "./pieces-justificatives.service";

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
  | "annotation_ambigue"
  | "annotation_modifiee"
  | "parcours_inconnu";

export interface CandidatReconciliation {
  dsNumber: string;
  step: Step;
  state: string;
  parcoursId: string | null;
  /** Plusieurs annotations portent des parcours différents : dossier dupliqué ou retouché. */
  annotationAmbigue?: boolean;
  /** DN signale la valeur préremplie comme modifiée à la main : elle ne fait plus foi. */
  annotationModifiee?: boolean;
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
  // Une annotation retouchée ou divergente n'est plus une source fiable : arbitrage humain.
  if (candidat.annotationAmbigue) return "annotation_ambigue";
  if (candidat.annotationModifiee) return "annotation_modifiee";
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
  /** Le balayage a-t-il vu TOUS les dossiers du périmètre demandé ? */
  scanComplet: boolean;
  /** Pourquoi le balayage s'est arrêté avant la fin, le cas échéant. */
  scanIncompletRaison?: string;
  pagesLues: number;
}

function totauxVides(): Record<VerdictReconciliation, number> {
  return {
    rattachement: 0,
    deja_a_jour: 0,
    conflit_autre_parcours: 0,
    conflit_dossier_confirme: 0,
    conflit_plusieurs_deposes: 0,
    sans_annotation: 0,
    annotation_ambigue: 0,
    annotation_modifiee: 0,
    parcours_inconnu: 0,
  };
}

export type RefusRattachementManuel =
  | "numero_invalide"
  | "introuvable_cote_dn"
  | "deja_rattache_ailleurs"
  | "dossier_deja_confirme"
  | "demarche_inconnue"
  | "annotation_autre_parcours";

export const MESSAGES_RATTACHEMENT_MANUEL: Record<RefusRattachementManuel, string> = {
  numero_invalide: "Le numéro de dossier doit être composé de chiffres uniquement.",
  introuvable_cote_dn: "Aucun dossier déposé ne porte ce numéro côté Démarches Numériques.",
  deja_rattache_ailleurs: "Ce numéro est déjà rattaché à un autre demandeur.",
  dossier_deja_confirme: "Ce parcours a déjà un dossier déposé pour cette étape : à trancher avant de rattacher.",
  demarche_inconnue: "Ce dossier appartient à une démarche qui ne fait pas partie du parcours FPA.",
  annotation_autre_parcours: "Ce dossier porte déjà le lien d'un autre demandeur : à vérifier avant de rattacher.",
};

/** Étape correspondant à une démarche DN, ou `null` si elle n'est pas configurée. */
function stepDeLaDemarche(demarcheNumber: number): Step | null {
  const steps = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];
  return steps.find((s) => resolveDemarcheNumberForStep(s) === demarcheNumber) ?? null;
}

/**
 * Rattachement manuel d'un dossier DN à un parcours, par son numéro (ADR-0027).
 * Recours pour les dossiers créés hors de notre lien : sans annotation FPA, la
 * réconciliation automatique ne peut pas les retrouver.
 */
export async function rattacherDossierManuel(params: {
  parcoursId: string;
  dsNumber: string;
}): Promise<ActionResult<{ dsNumber: string; step: Step }>> {
  const dsNumber = params.dsNumber.trim();
  if (!/^\d+$/.test(dsNumber)) {
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.numero_invalide };
  }

  // Le dossier doit exister côté DN : un brouillon non déposé y est invisible, on ne rattache
  // donc que du réel.
  let dossierDn: Awaited<ReturnType<typeof graphqlClient.getDossierPourRattachement>> = null;
  try {
    dossierDn = await graphqlClient.getDossierPourRattachement(Number(dsNumber));
  } catch {
    dossierDn = null;
  }
  if (!dossierDn) {
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.introuvable_cote_dn };
  }

  // L'étape vient de la démarche du dossier, jamais de l'étape courante du parcours : sinon un
  // dossier d'éligibilité pourrait être enregistré comme diagnostic (ADR-0027).
  const demarcheNumber = dossierDn.demarche?.number;
  const step = demarcheNumber ? stepDeLaDemarche(demarcheNumber) : null;
  if (!step || !demarcheNumber) {
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.demarche_inconnue };
  }

  // Si le dossier porte déjà un lien FPA vers un AUTRE parcours, on ne le vole pas.
  const lecture = lireAnnotationFpa(dossierDn.annotations, getAnnotationLienFpaId(step, demarcheNumber));
  if (lecture.parcoursId && lecture.parcoursId !== params.parcoursId) {
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.annotation_autre_parcours };
  }

  // Les deux tables portent chacune leur unicité sur `ds_number` : il faut interroger les deux,
  // sinon un numéro déjà pointé ailleurs mais absent du registre passerait (ADR-0027).
  const tentative = await dossiersDsTentativesRepo.findByDsNumber(dsNumber);
  if (tentative && tentative.parcoursId !== params.parcoursId) {
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.deja_rattache_ailleurs };
  }

  const [pointeurAilleurs] = await db
    .select({ parcoursId: dossiersDemarchesSimplifiees.parcoursId })
    .from(dossiersDemarchesSimplifiees)
    .where(eq(dossiersDemarchesSimplifiees.dsNumber, dsNumber))
    .limit(1);
  if (pointeurAilleurs && pointeurAilleurs.parcoursId !== params.parcoursId) {
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.deja_rattache_ailleurs };
  }

  const [pointeur] = await db
    .select({
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      submittedAt: dossiersDemarchesSimplifiees.submittedAt,
      lastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
    })
    .from(dossiersDemarchesSimplifiees)
    .where(
      and(eq(dossiersDemarchesSimplifiees.parcoursId, params.parcoursId), eq(dossiersDemarchesSimplifiees.step, step))
    )
    .limit(1);

  if (pointeur && pointeur.dsNumber !== dsNumber && (pointeur.submittedAt || pointeur.lastSyncAt)) {
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.dossier_deja_confirme };
  }

  try {
    await appliquerRattachement(
      { parcoursId: params.parcoursId, step, dsNumber, dsDemarcheId: String(demarcheNumber) },
      ORIGINE_TENTATIVE.MANUEL
    );
  } catch (error) {
    console.error("rattacherDossierManuel : rattachement refusé", error);
    return { success: false, error: MESSAGES_RATTACHEMENT_MANUEL.deja_rattache_ailleurs };
  }

  return { success: true, data: { dsNumber, step } };
}

interface Collecte {
  candidats: CandidatReconciliation[];
  complet: boolean;
  raison?: string;
  pages: number;
}

/**
 * Pagination des dossiers d'une démarche (DN plafonne à 100 par page).
 *
 * La complétude est remontée explicitement : un scan tronqué ne doit JAMAIS servir de base à
 * un rattachement. Un second dossier déposé pourrait se trouver dans les pages manquantes, et
 * ce qui aurait dû être un conflit deviendrait un rattachement automatique erroné.
 */
async function collecterCandidats(
  demarcheNumber: number,
  step: Step,
  updatedSince?: string,
  maxPages = 100
): Promise<Collecte> {
  const descripteurAttendu = getAnnotationLienFpaId(step, demarcheNumber);
  const candidats: CandidatReconciliation[] = [];
  let after: string | undefined;
  let pages = 0;

  while (pages < maxPages) {
    pages++;
    const conn = await graphqlClient.getDossiersPourReconciliation(demarcheNumber, { first: 100, after, updatedSince });
    // Le client convertit toute erreur DN en `null` : impossible de distinguer une démarche
    // vide d'un appel en échec, donc on considère le scan incomplet.
    if (!conn) {
      return { candidats, complet: false, raison: `appel DN sans réponse (page ${pages})`, pages };
    }

    for (const node of conn.nodes) {
      const lecture = lireAnnotationFpa(node.annotations, descripteurAttendu);
      candidats.push({
        dsNumber: String(node.number),
        step,
        state: node.state,
        parcoursId: lecture.parcoursId,
        annotationAmbigue: lecture.ambigue,
        annotationModifiee: lecture.modifiee,
      });
    }

    if (!conn.pageInfo.hasNextPage) return { candidats, complet: true, pages };

    after = conn.pageInfo.endCursor ?? undefined;
    if (!after) {
      return { candidats, complet: false, raison: `curseur absent alors qu'il reste des pages (page ${pages})`, pages };
    }
  }

  return { candidats, complet: false, raison: `plafond de ${maxPages} pages atteint`, pages };
}

/** Repointe l'étape vers le dossier réel et remet son état à zéro : la sync le recopiera. */
async function appliquerRattachement(
  candidat: { parcoursId: string; step: Step; dsNumber: string; dsDemarcheId: string },
  origine: OrigineTentative
): Promise<void> {
  await db.transaction(async (tx) => {
    // Un numéro pointé par un autre parcours ne doit jamais être volé : la contrainte unique
    // le rattraperait, mais avec une erreur SQL opaque au lieu d'un refus métier.
    const [pointeurAilleurs] = await tx
      .select({ parcoursId: dossiersDemarchesSimplifiees.parcoursId })
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.dsNumber, candidat.dsNumber))
      .limit(1);

    if (pointeurAilleurs && pointeurAilleurs.parcoursId !== candidat.parcoursId) {
      throw new Error(`Le numéro DN ${candidat.dsNumber} est déjà le dossier d'un autre parcours`);
    }

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
    } else {
      // Pas de pointeur : c'est le cas des parcours dont la ligne avait été supprimée par
      // l'ancien reset. On le recrée, sinon leur dossier resterait invisible de l'app.
      await tx.insert(dossiersDemarchesSimplifiees).values({
        parcoursId: candidat.parcoursId,
        step: candidat.step,
        dsNumber: candidat.dsNumber,
        dsDemarcheId: candidat.dsDemarcheId,
      });
    }

    await dossiersDsTentativesRepo.record(
      {
        parcoursId: candidat.parcoursId,
        step: candidat.step,
        dsNumber: candidat.dsNumber,
        origine,
        dsDemarcheId: existant?.dsDemarcheId ?? candidat.dsDemarcheId,
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

  const collecte = await collecterCandidats(demarcheNumber, step, updatedSince);
  const candidats = collecte.candidats;

  // Échec fermé : sur un scan tronqué on rend le rapport (utile au diagnostic) sans rien écrire.
  const peutEcrire = apply && collecte.complet;

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

    if (peutEcrire && verdict === "rattachement" && candidat.parcoursId) {
      await appliquerRattachement(
        {
          parcoursId: candidat.parcoursId,
          step: candidat.step,
          dsNumber: candidat.dsNumber,
          dsDemarcheId: String(demarcheNumber),
        },
        ORIGINE_TENTATIVE.RECONCILIATION
      );
      rattachementsAppliques++;
    }
  }

  return {
    lignes,
    totaux,
    rattachementsAppliques,
    scanComplet: collecte.complet,
    scanIncompletRaison: collecte.raison,
    pagesLues: collecte.pages,
  };
}
