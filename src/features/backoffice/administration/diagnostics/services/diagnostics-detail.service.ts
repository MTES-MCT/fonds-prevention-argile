import { parcoursRepo, dossierDsRepo, userRepo } from "@/shared/database/repositories";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { prefillClient } from "@/features/parcours/dossiers-ds/adapters";
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

    const anomalyType =
      d.dsNumber && d.dsStatus
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
