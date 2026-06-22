import { and, eq, isNotNull, isNull, inArray } from "drizzle-orm";
import { parcoursRepo, dossierDsRepo, userRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import { parcoursPrevention, dossiersDemarchesSimplifiees, syncRunEntries } from "@/shared/database/schema";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { prefillClient } from "@/features/parcours/dossiers-ds/adapters";
import { recordDnProbeState } from "@/features/parcours/dossiers-ds/services/dossier-ds.service";
import { Step } from "@/shared/domain/value-objects/step.enum";
import {
  classifyDossierAnomaly,
  explainDsAnomaly,
  type DsAnomalyType,
  type DsAnomalyExplanation,
} from "@/features/parcours/dossiers-ds/domain/value-objects/ds-anomaly";

/**
 * Cross-check DS LIVE pour UN parcours (réservé au détail super-admin). Appels DS limités au
 * nombre de dossiers du parcours (≤ 5). La recherche par email est explicite et plus coûteuse.
 */

const SLEEP_MS = 150;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Traduit une erreur DS levée par getDossier en code normalisé pour la classification. */
function toDsError(err: unknown): "not_found" | "unauthorized" | "api_error" {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes("not found") || msg.includes("not_found")) return "not_found";
  if (msg.includes("unauthorized")) return "unauthorized";
  return "api_error";
}

export interface DossierCrossCheck {
  step: Step;
  dsNumber: string | null;
  localStatus: string | null;
  submittedAt: Date | null;
  instructedAt: Date | null;
  lastSyncAt: Date | null;
  /** Vrai état renvoyé par DS (ou null si erreur / absence de numéro). */
  dsState: string | null;
  dsError: string | null;
  anomalyType: DsAnomalyType | null;
  explanation: DsAnomalyExplanation | null;
  /** Chronologie pas-à-pas du « comment on en est arrivé là » (cas drop-off / faux dépôt). */
  timeline: string[] | null;
}

/**
 * Reconstitue la chronologie d'un dossier « drop-off » (jamais confirmé côté DN et
 * introuvable). Détaille surtout le cas du `submitted_at` legacy laissé par la PR #216.
 */
function buildDossierTimeline(d: {
  submittedAt: Date | null;
  lastSyncAt: Date | null;
  dsError: string | null;
}): string[] | null {
  // Ciblé : jamais confirmé côté DN (last_sync_at NULL) ET introuvable (not_found) = drop-off.
  if (d.lastSyncAt || d.dsError !== "not_found") return null;

  const fauxDepotLegacy = !!d.submittedAt;
  const steps: string[] = [
    "L'usager arrive à l'étape éligibilité et clique « Remplir le formulaire ». L'app crée un dossier prérempli sur Démarches Numériques (API de préremplissage) et stocke son numéro et le lien « commencer ».",
  ];
  if (fauxDepotLegacy) {
    steps.push(
      "Avant la PR #216, ce code de création posait aussi ds_status = en_construction et submitted_at = maintenant : le dossier était marqué « déposé » dès sa création, alors que l'usager n'avait encore rien rempli."
    );
  }
  steps.push(
    "L'usager n'a jamais ouvert ni complété le formulaire sur Démarches Numériques.",
    "Démarches Numériques purge les dossiers préremplis non complétés après un délai : le dossier disparaît côté DN — la synchronisation renvoie désormais « Dossier not found »."
  );
  if (fauxDepotLegacy) {
    steps.push(
      "La PR #216 a repassé ds_status à NULL pour les dossiers jamais synchronisés (last_sync_at NULL), mais a laissé submitted_at en place. D'où l'état actuel : ds_status = NULL, last_sync_at = NULL, et un submitted_at trompeur qui est en réalité la date de CRÉATION, pas un vrai dépôt."
    );
  }
  steps.push(
    `Bilan : l'usager n'a jamais déposé (drop-off), le parcours reste bloqué en éligibilité avec un dossier fantôme. Remédiation : reset (nouveau lien « commencer »)${fauxDepotLegacy ? " puis nettoyage du faux submitted_at" : ""}.`
  );
  return steps;
}

export interface ParcoursDiagnosticDetail {
  parcoursId: string;
  currentStep: Step;
  currentStatus: string;
  archivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  user: { nom: string | null; prenom: string | null; email: string | null; emailContact: string | null };
  dossiers: DossierCrossCheck[];
}

export async function getParcoursDiagnosticDetail(parcoursId: string): Promise<ParcoursDiagnosticDetail | null> {
  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) return null;

  const user = await userRepo.findById(parcours.userId);
  const dossiers = await dossierDsRepo.findByParcoursId(parcoursId);

  const crossChecks: DossierCrossCheck[] = [];
  for (const d of dossiers) {
    let dsState: string | null = null;
    let dsError: string | null = null;

    if (d.dsNumber) {
      try {
        const status = await graphqlClient.getDossierStatus(Number(d.dsNumber));
        if (status) dsState = status.state;
        else dsError = "not_found";
      } catch (err) {
        dsError = toDsError(err);
      }
      await sleep(SLEEP_MS);
    }

    // On classifie dès qu'il y a un numéro DN, MÊME si ds_status est NULL (jamais
    // synchronisé) : c'est justement le cas des dossiers "drop-off / prefill jamais
    // complété" qu'on veut diagnostiquer. classifyDossierAnomaly gère localStatus null.
    const anomalyType = d.dsNumber
      ? classifyDossierAnomaly({
          localStatus: d.dsStatus,
          ds: dsError ? { error: dsError } : { state: dsState ?? undefined },
        })
      : null;

    crossChecks.push({
      step: d.step,
      dsNumber: d.dsNumber,
      localStatus: d.dsStatus,
      submittedAt: d.submittedAt,
      instructedAt: d.instructedAt,
      lastSyncAt: d.lastSyncAt,
      dsState,
      dsError,
      anomalyType,
      explanation: anomalyType ? explainDsAnomaly(anomalyType) : null,
      timeline: buildDossierTimeline({ submittedAt: d.submittedAt, lastSyncAt: d.lastSyncAt, dsError }),
    });
  }

  return {
    parcoursId: parcours.id,
    currentStep: parcours.currentStep,
    currentStatus: parcours.currentStatus,
    archivedAt: parcours.archivedAt,
    completedAt: parcours.completedAt,
    createdAt: parcours.createdAt,
    user: {
      nom: user?.nom ?? null,
      prenom: user?.prenom ?? null,
      email: user?.email ?? null,
      emailContact: user?.emailContact ?? null,
    },
    dossiers: crossChecks,
  };
}

export interface DsEmailHit {
  dossierNumber: number;
  state: string;
  archived: boolean;
  matchedEmail: string;
}

/** Cap de pagination défensif pour la recherche par email (évite un balayage illimité). */
const MAX_PAGES = 30;

/**
 * Recherche les dossiers de la démarche éligibilité dont l'usager DS correspond à un email du
 * demandeur (users.email / emailContact). Sert à retrouver un dossier "perdu" (orphelin).
 * Coûteux : pagine la démarche → action explicite uniquement.
 */
export async function searchEligibiliteByEmail(parcoursId: string): Promise<{ hits: DsEmailHit[]; capped: boolean }> {
  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) return { hits: [], capped: false };

  const user = await userRepo.findById(parcours.userId);
  const emails = Array.from(
    new Set([user?.email, user?.emailContact].filter((e): e is string => !!e).map((e) => e.toLowerCase().trim()))
  );
  if (emails.length === 0) return { hits: [], capped: false };

  const demarcheNumber = Number(prefillClient.getDemarcheId(Step.ELIGIBILITE));
  const hits: DsEmailHit[] = [];
  const seen = new Set<number>();

  let after: string | null = null;
  let pages = 0;
  let capped = false;

  while (pages < MAX_PAGES) {
    pages++;
    const conn = await graphqlClient.getDemarcheDossiers(demarcheNumber, { first: 100, after: after ?? undefined });
    if (!conn) break;

    for (const node of conn.nodes) {
      const email = node.usager?.email?.toLowerCase().trim();
      if (!email || !emails.includes(email) || seen.has(node.number)) continue;
      seen.add(node.number);
      hits.push({ dossierNumber: node.number, state: node.state, archived: node.archived, matchedEmail: email });
    }

    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor ?? null;
    await sleep(200);
    if (pages >= MAX_PAGES && conn.pageInfo.hasNextPage) capped = true;
  }

  return { hits, capped };
}

/** Cap défensif du sondage DN à la demande (borne le coût / les appels DN). */
const PROBE_CAP = 300;

/**
 * Sonde DN (lecture seule) le dossier de l'étape courante des parcours actifs **en
 * sync-erreur**, et persiste le verdict (`dn_probe_state`) via la sync. Permet de rafraîchir
 * la « vérité DN » de la liste à la demande, sans attendre le prochain CRON. Borné à la
 * sous-population en erreur (≪ tout le parc).
 */
export async function probeDnForSyncErrors(): Promise<{ probed: number; capped: boolean }> {
  const errorRows = await db
    .select({ parcoursId: syncRunEntries.parcoursId })
    .from(syncRunEntries)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, syncRunEntries.parcoursId))
    .where(
      and(
        isNotNull(syncRunEntries.error),
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt)
      )
    );
  const ids = [...new Set(errorRows.map((r) => r.parcoursId))];
  if (ids.length === 0) return { probed: 0, capped: false };

  // Dossier de l'étape courante (avec un numéro DN) de ces parcours.
  const dossiers = await db
    .select({ id: dossiersDemarchesSimplifiees.id, dsNumber: dossiersDemarchesSimplifiees.dsNumber })
    .from(dossiersDemarchesSimplifiees)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, dossiersDemarchesSimplifiees.parcoursId))
    .where(
      and(
        inArray(dossiersDemarchesSimplifiees.parcoursId, ids),
        eq(dossiersDemarchesSimplifiees.step, parcoursPrevention.currentStep),
        isNotNull(dossiersDemarchesSimplifiees.dsNumber)
      )
    );

  const capped = dossiers.length > PROBE_CAP;
  const batch = dossiers.slice(0, PROBE_CAP);

  let probed = 0;
  for (const d of batch) {
    if (!d.dsNumber) continue;
    try {
      const status = await graphqlClient.getDossierStatus(Number(d.dsNumber));
      await recordDnProbeState(d.id, status ? status.state : "not_found");
    } catch (err) {
      await recordDnProbeState(d.id, toDsError(err));
    }
    probed++;
    await sleep(SLEEP_MS);
  }
  return { probed, capped };
}
