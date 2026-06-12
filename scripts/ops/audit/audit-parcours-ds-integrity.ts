/**
 * Script d'audit (read-only) des parcours dont l'état interne n'a pas de contrepartie
 * sur demarches-simplifiees.fr.
 *
 * Cible en priorité : parcours avec current_step IN (diagnostic, devis, factures)
 * sans ligne dossiers_demarches_simplifiees step='eligibilite' ds_status='accepte'.
 *
 * Pour chaque parcours orphelin, recherche par email côté DS (démarche éligibilité,
 * puis éventuellement diagnostic / devis / factures si applicable) et remonte les
 * dossiers DS trouvés pour décider manuellement d'un rattachement.
 *
 * AUCUNE ÉCRITURE EN BASE. AUCUN APPEL D'ÉCRITURE VERS DS.
 *
 * Usage :
 *   pnpm tsx scripts/ops/audit-parcours-ds-integrity.ts
 *   pnpm tsx scripts/ops/audit-parcours-ds-integrity.ts --csv=rapport.csv
 *   pnpm tsx scripts/ops/audit-parcours-ds-integrity.ts --parcours-id=<uuid>
 *   pnpm tsx scripts/ops/audit-parcours-ds-integrity.ts --anonymize   # masque les PII pour partage
 *
 * Prérequis : .env.local avec DATABASE_URL + DEMARCHES_SIMPLIFIEES_*
 */

import { writeFileSync } from "node:fs";
import { and, eq, inArray, desc } from "drizzle-orm";
import { createOpsDb } from "../lib/db";
import { createRedactor } from "../lib/anonymize";
import {
  parcoursPrevention,
  users,
  dossiersDemarchesSimplifiees,
  parcoursAmoValidations,
  parcoursActions,
  entreprisesAmo,
} from "@/shared/database/schema";
import { Step, STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  categorizeDoubleProgression,
  CATEGORY_LABELS,
  type DoubleProgressionCategory,
} from "../lib/double-progression";
import { getArg, hasFlag } from "../lib/args";

// --- Args ---
const CSV_PATH = getArg("csv");
const PARCOURS_ID_FILTER = getArg("parcours-id");
const ANONYMIZE = hasFlag("anonymize");

// --- Anonymisation (hash court stable pour le run, imprévisible d'un run à l'autre) ---
const { shortHash, redactEmail, redactName, redactUuid, redactDsNumber } = createRedactor(ANONYMIZE);

// --- Env ---
const GRAPHQL_URL =
  process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL || "https://www.demarches-simplifiees.fr/api/v2/graphql";
const API_KEY = process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY;

const DEMARCHE_IDS: Partial<Record<Step, string | undefined>> = {
  [Step.ELIGIBILITE]: process.env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
  [Step.DIAGNOSTIC]: process.env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC,
  [Step.DEVIS]: process.env.DEMARCHES_SIMPLIFIEES_ID_DEVIS,
  [Step.FACTURES]: process.env.DEMARCHES_SIMPLIFIEES_ID_FACTURES,
};

if (!API_KEY) {
  console.error("DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY manquante dans .env.local");
  process.exit(1);
}
for (const step of [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES]) {
  if (!DEMARCHE_IDS[step]) {
    console.error(`DEMARCHES_SIMPLIFIEES_ID_${step.toUpperCase()} manquant dans .env.local`);
    process.exit(1);
  }
}

// --- DB ---
const { db, client } = createOpsDb();

// --- Types ---
interface DsSearchHit {
  dossierNumber: number;
  state: string;
  archived: boolean;
  datePassageEnInstruction?: string | null;
  dateTraitement?: string | null;
  matchedOn?: "users.email" | "users.emailContact" | "parcoursAmoValidations.userEmail";
}

interface AmoValidationSummary {
  statut: string;
  entrepriseAmoNom: string | null;
  commentaire: string | null;
  userPrenom: string | null;
  userNom: string | null;
  userEmail: string | null;
  userTelephone: string | null;
  adresseLogement: string | null;
  choisieAt: Date;
  valideeAt: Date | null;
}

interface CommentaireSummary {
  authorName: string;
  authorStructure: string | null;
  authorStructureType: string | null;
  message: string | null;
  createdAt: Date;
}

interface ParcoursReport {
  parcoursId: string;
  userId: string;
  userEmail: string | null;
  userEmailContact: string | null;
  userNom: string | null;
  userPrenom: string | null;
  userTelephone: string | null;
  userCreatedAt: Date;
  userLastLogin: Date;
  currentStep: string;
  currentStatus: string;
  parcoursCreatedAt: Date;
  parcoursUpdatedAt: Date;
  archivedAt: Date | null;
  archiveReason: string | null;
  localDossiers: Array<{
    id: string;
    step: string;
    dsNumber: string | null;
    dsStatus: string;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  amoValidation: AmoValidationSummary | null;
  commentaires: CommentaireSummary[];
  emailsToSearch: string[];
  dsSearch: Partial<Record<Step, DsSearchHit[] | "skipped" | "error">>;
  anomalies: string[];
  category: DoubleProgressionCategory;
}

// --- DS API ---
const DOSSIERS_QUERY = `
  query DemarcheDossiers($number: Int!, $first: Int!, $after: String) {
    demarche(number: $number) {
      dossiers(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          state
          archived
          datePassageEnInstruction
          dateTraitement
          usager { email }
        }
      }
    }
  }
`;

interface DossierNode {
  number: number;
  state: string;
  archived: boolean;
  datePassageEnInstruction: string | null;
  dateTraitement: string | null;
  usager: { email: string } | null;
}

interface PaginatedNodes {
  demarche: {
    dossiers: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: DossierNode[];
    };
  };
}

async function fetchGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const resp = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }
  const json = await resp.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`);
  }
  return json.data as T;
}

const demarcheCache = new Map<Step, DossierNode[]>();

async function loadAllDossiersForDemarche(step: Step): Promise<DossierNode[]> {
  const cached = demarcheCache.get(step);
  if (cached) return cached;

  const demarcheNumber = Number(DEMARCHE_IDS[step]);
  const all: DossierNode[] = [];
  let after: string | null = null;
  let page = 0;

  while (true) {
    page++;
    process.stdout.write(`    [${step}] page ${page} (${all.length} dossiers)...\r`);
    const data: PaginatedNodes = await fetchGraphQL<PaginatedNodes>(DOSSIERS_QUERY, {
      number: demarcheNumber,
      first: 100,
      after,
    });
    const conn: PaginatedNodes["demarche"]["dossiers"] | undefined = data.demarche?.dossiers;
    if (!conn) break;
    all.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
    await new Promise((r) => setTimeout(r, 200)); // rate-limit défensif
  }
  process.stdout.write(`    [${step}] ${all.length} dossiers récupérés (${page} pages).\n`);

  demarcheCache.set(step, all);
  return all;
}

async function searchDossiersByEmails(
  step: Step,
  emailsWithOrigin: Array<{ email: string; origin: DsSearchHit["matchedOn"] }>
): Promise<DsSearchHit[]> {
  const all = await loadAllDossiersForDemarche(step);
  const hits: DsSearchHit[] = [];
  const seen = new Set<number>();
  for (const { email, origin } of emailsWithOrigin) {
    const normalized = email.toLowerCase().trim();
    for (const d of all) {
      if (d.usager?.email?.toLowerCase().trim() !== normalized) continue;
      if (seen.has(d.number)) continue;
      seen.add(d.number);
      hits.push({
        dossierNumber: d.number,
        state: d.state,
        archived: d.archived,
        datePassageEnInstruction: d.datePassageEnInstruction,
        dateTraitement: d.dateTraitement,
        matchedOn: origin,
      });
    }
  }
  return hits;
}

// --- Main ---
const STEPS_AT_RISK: Step[] = [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

async function main() {
  console.log("=".repeat(72));
  console.log(`AUDIT PARCOURS ORPHELINS (read-only)${ANONYMIZE ? " — mode anonymisé" : ""}`);
  console.log("=".repeat(72));
  if (ANONYMIZE) {
    console.log(
      "Les PII (email, nom, prénom, IDs) sont masquées. Un hash court stable pour ce run permet de corréler les lignes du rapport sans exposer les identifiants."
    );
  }
  console.log();

  const whereClauses = [inArray(parcoursPrevention.currentStep, STEPS_AT_RISK)];
  if (PARCOURS_ID_FILTER) {
    whereClauses.push(eq(parcoursPrevention.id, PARCOURS_ID_FILTER));
  }

  const candidates = await db
    .select({
      parcoursId: parcoursPrevention.id,
      userId: parcoursPrevention.userId,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      parcoursCreatedAt: parcoursPrevention.createdAt,
      parcoursUpdatedAt: parcoursPrevention.updatedAt,
      archivedAt: parcoursPrevention.archivedAt,
      archiveReason: parcoursPrevention.archiveReason,
      userEmail: users.email,
      userEmailContact: users.emailContact,
      userNom: users.nom,
      userPrenom: users.prenom,
      userTelephone: users.telephone,
      userCreatedAt: users.createdAt,
      userLastLogin: users.lastLogin,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(parcoursPrevention.userId, users.id))
    .where(and(...whereClauses));

  console.log(
    `Candidats (current_step IN [${STEPS_AT_RISK.join(", ")}]${PARCOURS_ID_FILTER ? `, parcours=${PARCOURS_ID_FILTER}` : ""}) : ${candidates.length}`
  );
  console.log();

  const reports: ParcoursReport[] = [];

  for (const c of candidates) {
    const dossiers = await db
      .select({
        id: dossiersDemarchesSimplifiees.id,
        step: dossiersDemarchesSimplifiees.step,
        dsNumber: dossiersDemarchesSimplifiees.dsNumber,
        dsStatus: dossiersDemarchesSimplifiees.dsStatus,
        submittedAt: dossiersDemarchesSimplifiees.submittedAt,
        createdAt: dossiersDemarchesSimplifiees.createdAt,
        updatedAt: dossiersDemarchesSimplifiees.updatedAt,
      })
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.parcoursId, c.parcoursId));

    const anomalies: string[] = [];

    const eligibiliteAccepte = dossiers.find((d) => d.step === Step.ELIGIBILITE && d.dsStatus === DSStatus.ACCEPTE);
    if (!eligibiliteAccepte) {
      anomalies.push(`current_step=${c.currentStep} mais aucune ligne DS step=eligibilite avec ds_status=accepte`);
    }

    const dossierCourant = dossiers.find((d) => d.step === c.currentStep);
    if (!dossierCourant) {
      anomalies.push(`aucune ligne DS pour l'étape courante (${c.currentStep})`);
    }

    if (anomalies.length === 0) {
      continue; // parcours cohérent, on ne l'inclut pas dans le rapport
    }

    // Contexte BDD : validation AMO + commentaires
    const [amoRow] = await db
      .select({
        statut: parcoursAmoValidations.statut,
        entrepriseAmoNom: entreprisesAmo.nom,
        commentaire: parcoursAmoValidations.commentaire,
        userPrenom: parcoursAmoValidations.userPrenom,
        userNom: parcoursAmoValidations.userNom,
        userEmail: parcoursAmoValidations.userEmail,
        userTelephone: parcoursAmoValidations.userTelephone,
        adresseLogement: parcoursAmoValidations.adresseLogement,
        choisieAt: parcoursAmoValidations.choisieAt,
        valideeAt: parcoursAmoValidations.valideeAt,
      })
      .from(parcoursAmoValidations)
      .leftJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      .where(eq(parcoursAmoValidations.parcoursId, c.parcoursId))
      .limit(1);

    const commentaires = await db
      .select({
        authorName: parcoursActions.authorName,
        authorStructure: parcoursActions.authorStructure,
        authorStructureType: parcoursActions.authorStructureType,
        message: parcoursActions.message,
        createdAt: parcoursActions.createdAt,
      })
      .from(parcoursActions)
      .where(eq(parcoursActions.parcoursId, c.parcoursId))
      .orderBy(desc(parcoursActions.createdAt));

    const emailsToSearch = Array.from(
      new Set(
        [c.userEmail, c.userEmailContact, amoRow?.userEmail]
          .filter((e): e is string => !!e)
          .map((e) => e.toLowerCase().trim())
      )
    );

    const report: ParcoursReport = {
      parcoursId: c.parcoursId,
      userId: c.userId,
      userEmail: c.userEmail,
      userEmailContact: c.userEmailContact,
      userNom: c.userNom,
      userPrenom: c.userPrenom,
      userTelephone: c.userTelephone,
      userCreatedAt: c.userCreatedAt,
      userLastLogin: c.userLastLogin,
      currentStep: c.currentStep,
      currentStatus: c.currentStatus,
      parcoursCreatedAt: c.parcoursCreatedAt,
      parcoursUpdatedAt: c.parcoursUpdatedAt,
      archivedAt: c.archivedAt,
      archiveReason: c.archiveReason,
      localDossiers: dossiers,
      amoValidation: amoRow ?? null,
      commentaires,
      emailsToSearch,
      dsSearch: {},
      anomalies,
      category: categorizeDoubleProgression(dossiers),
    };
    reports.push(report);
  }

  console.log(`Parcours à examiner (étape courante sans dossier DS — inclut des cas légitimes) : ${reports.length}`);

  // Tri par catégorie : combien sont des cas légitimes vs de vrais bugs à corriger.
  const byCategory = {
    legitime: reports.filter((r) => r.category === "legitime").length,
    regressable: reports.filter((r) => r.category === "regressable").length,
    cleanup_requis: reports.filter((r) => r.category === "cleanup_requis").length,
    a_reviewer: reports.filter((r) => r.category === "a_reviewer").length,
  };
  console.log();
  console.log("Répartition par catégorie (cf. fix-double-progression-amo.ts) :");
  console.log(`  - légitimes (rien à corriger)         : ${byCategory.legitime}`);
  console.log(`  - régressables (bug)                  : ${byCategory.regressable}`);
  console.log(`  - cleanup requis (bug type Edouard)   : ${byCategory.cleanup_requis}`);
  console.log(`  - à reviewer manuellement             : ${byCategory.a_reviewer}`);
  const aCorriger = byCategory.regressable + byCategory.cleanup_requis + byCategory.a_reviewer;
  console.log(`  → ${aCorriger} parcours à corriger, ${byCategory.legitime} légitimes.`);
  console.log();

  if (reports.length === 0) {
    console.log("\nAucun parcours à examiner. Fin.");
    await client.end();
    return;
  }

  // Étapes à interroger côté DS = eligibilite + étapes >= current_step pour chaque orphelin
  const stepsToSearch = new Set<Step>();
  stepsToSearch.add(Step.ELIGIBILITE);
  for (const r of reports) {
    const idx = STEPS_AT_RISK.indexOf(r.currentStep as Step);
    if (idx >= 0) {
      for (const s of STEPS_AT_RISK.slice(0, idx + 1)) stepsToSearch.add(s);
    }
  }

  console.log(`\nChargement des dossiers DS (démarches : ${[...stepsToSearch].join(", ")})...`);
  for (const step of stepsToSearch) {
    try {
      await loadAllDossiersForDemarche(step);
    } catch (err) {
      console.error(`Échec chargement démarche ${step}:`, err);
      for (const r of reports) r.dsSearch[step] = "error";
    }
  }

  // Recherche par email (users.email + users.emailContact + parcoursAmoValidations.userEmail)
  for (const r of reports) {
    if (r.emailsToSearch.length === 0) {
      for (const step of stepsToSearch) r.dsSearch[step] = "skipped";
      continue;
    }
    const emailsWithOrigin: Array<{ email: string; origin: DsSearchHit["matchedOn"] }> = [];
    if (r.userEmail) emailsWithOrigin.push({ email: r.userEmail, origin: "users.email" });
    if (r.userEmailContact && r.userEmailContact !== r.userEmail) {
      emailsWithOrigin.push({ email: r.userEmailContact, origin: "users.emailContact" });
    }
    if (
      r.amoValidation?.userEmail &&
      r.amoValidation.userEmail !== r.userEmail &&
      r.amoValidation.userEmail !== r.userEmailContact
    ) {
      emailsWithOrigin.push({
        email: r.amoValidation.userEmail,
        origin: "parcoursAmoValidations.userEmail",
      });
    }

    for (const step of stepsToSearch) {
      if (r.dsSearch[step] === "error") continue;
      try {
        r.dsSearch[step] = await searchDossiersByEmails(step, emailsWithOrigin);
      } catch (err) {
        console.error(`  [${r.parcoursId}] Erreur recherche démarche ${step}:`, err);
        r.dsSearch[step] = "error";
      }
    }
  }

  // --- Rapport ---
  console.log("\n" + "=".repeat(72));
  console.log(`RAPPORT${ANONYMIZE ? " (ANONYMISÉ — sûr à partager)" : ""}`);
  console.log("=".repeat(72));

  reports.forEach((r, i) => {
    console.log(`\n--- Parcours #${i + 1} — ${CATEGORY_LABELS[r.category]} ---`);
    console.log(`  parcoursId         : ${redactUuid(r.parcoursId)}`);
    console.log(`  userId             : ${redactUuid(r.userId)}`);
    console.log(`  user               : ${redactName(r.userNom, r.userPrenom)}`);
    console.log(`  users.email        : ${redactEmail(r.userEmail)}`);
    console.log(`  users.emailContact : ${redactEmail(r.userEmailContact)}`);
    if (r.userTelephone) console.log(`  users.telephone    : ${ANONYMIZE ? "<masqué>" : r.userTelephone}`);
    console.log(`  user créé le       : ${r.userCreatedAt.toISOString()}`);
    console.log(`  user last login    : ${r.userLastLogin.toISOString()}`);
    console.log(`  current_step/status: ${r.currentStep} / ${r.currentStatus}`);
    console.log(`  parcours créé le   : ${r.parcoursCreatedAt.toISOString()}`);
    console.log(`  parcours màj le    : ${r.parcoursUpdatedAt.toISOString()}`);
    if (r.archivedAt) {
      console.log(`  archived           : ${r.archivedAt.toISOString()} (${r.archiveReason ?? "sans raison"})`);
    }
    console.log(`  à examiner         :`);
    for (const a of r.anomalies) console.log(`    - ${a}`);

    // Lignes DS locales
    console.log(`  lignes DS locales  : ${r.localDossiers.length === 0 ? "aucune" : ""}`);
    for (const d of r.localDossiers) {
      const dsNum = d.dsNumber ? (ANONYMIZE ? redactDsNumber(Number(d.dsNumber)) : `#${d.dsNumber}`) : "?";
      console.log(
        `    - step=${d.step} ds_number=${dsNum} status=${d.dsStatus} submitted=${d.submittedAt?.toISOString() ?? "?"} created=${d.createdAt.toISOString()} updated=${d.updatedAt.toISOString()}`
      );
    }

    // Validation AMO
    if (r.amoValidation) {
      const v = r.amoValidation;
      console.log(`  validation AMO     :`);
      console.log(`    statut           : ${v.statut}`);
      console.log(
        `    entreprise       : ${ANONYMIZE ? `<amo:${shortHash(v.entrepriseAmoNom ?? "")}>` : (v.entrepriseAmoNom ?? "?")}`
      );
      console.log(`    choisie le       : ${v.choisieAt.toISOString()}`);
      console.log(`    validée le       : ${v.valideeAt?.toISOString() ?? "?"}`);
      console.log(`    user_email (amo) : ${redactEmail(v.userEmail)}`);
      console.log(`    user_nom (amo)   : ${redactName(v.userNom, v.userPrenom)}`);
      if (v.adresseLogement) {
        console.log(`    adresseLogement  : ${ANONYMIZE ? "<masqué>" : v.adresseLogement}`);
      }
      if (v.commentaire) {
        console.log(`    commentaire      : ${ANONYMIZE ? "<masqué>" : v.commentaire.slice(0, 200)}`);
      }
    } else {
      console.log(`  validation AMO     : aucune`);
    }

    // Commentaires internes
    if (r.commentaires.length > 0) {
      console.log(`  commentaires (${r.commentaires.length}):`);
      for (const cm of r.commentaires) {
        const author = ANONYMIZE ? `<author:${shortHash(cm.authorName)}>` : cm.authorName;
        const struct = cm.authorStructure ?? "?";
        const msg = ANONYMIZE ? `<message ${cm.message?.length ?? 0} chars>` : (cm.message?.slice(0, 200) ?? "");
        console.log(
          `    [${cm.createdAt.toISOString()}] ${author} (${struct}, ${cm.authorStructureType ?? "?"}): ${msg}`
        );
      }
    } else {
      console.log(`  commentaires       : aucun`);
    }

    // Recherche DS
    console.log(
      `  emails testés côté DS: ${r.emailsToSearch.length === 0 ? "aucun" : r.emailsToSearch.map(redactEmail).join(", ")}`
    );
    console.log(`  recherche côté DS  :`);
    for (const [step, hits] of Object.entries(r.dsSearch) as Array<[Step, DsSearchHit[] | "skipped" | "error"]>) {
      const label = STEP_LABELS[step];
      if (hits === "skipped") {
        console.log(`    [${label}] sauté (aucun email disponible)`);
      } else if (hits === "error") {
        console.log(`    [${label}] erreur API`);
      } else if (hits.length === 0) {
        console.log(`    [${label}] aucun dossier trouvé`);
      } else {
        for (const h of hits) {
          console.log(
            `    [${label}] dossier ${redactDsNumber(h.dossierNumber)} state=${h.state}${h.archived ? " (archivé)" : ""} instr=${h.datePassageEnInstruction ?? "?"} traité=${h.dateTraitement ?? "?"} (match: ${h.matchedOn ?? "?"})`
          );
        }
      }
    }

    // Suggestion synthétique
    const eligSearch = r.dsSearch[Step.ELIGIBILITE];
    if (Array.isArray(eligSearch) && eligSearch.length === 1) {
      const h = eligSearch[0];
      console.log(
        `  SUGGESTION         : rattacher dsNumber=${redactDsNumber(h.dossierNumber)} step=eligibilite state=${h.state}`
      );
    } else if (Array.isArray(eligSearch) && eligSearch.length > 1) {
      console.log(
        `  SUGGESTION         : ${eligSearch.length} dossiers éligibilité pour les emails testés — revue manuelle`
      );
    } else if (Array.isArray(eligSearch) && eligSearch.length === 0) {
      console.log(
        `  SUGGESTION         : aucun dossier DS trouvé sur les emails testés — voir listing éligibilité ACCEPTE ci-dessous pour rapprochement visuel (nom/prénom/date)`
      );
    }
  });

  // --- Listing éligibilité ACCEPTE (anonymisé si flag) ---
  // Fenêtre : dossiers DS éligibilité ACCEPTE traités dans une fenêtre plausible
  // → aide à rapprocher un parcours orphelin avec un dossier DS via nom/prénom/date
  const allEligibilite = demarcheCache.get(Step.ELIGIBILITE) ?? [];
  const accepte = allEligibilite.filter((d) => d.state === "accepte");
  if (accepte.length > 0) {
    console.log("\n" + "=".repeat(72));
    console.log(`LISTING DS ÉLIGIBILITÉ ACCEPTE (${accepte.length} dossiers) — inspection visuelle`);
    console.log("=".repeat(72));
    console.log("Hypothèse : le dossier DS peut avoir été finalisé sur DS avec un 3e email");
    console.log("non présent en BDD. Rapprocher visuellement via date/email.");
    console.log();
    console.log("  dsNumber           | traité le                  | email côté DS");
    console.log("  " + "-".repeat(82));
    // Trier par dateTraitement desc
    const sorted = [...accepte].sort((a, b) => {
      const da = a.dateTraitement ?? "";
      const db_ = b.dateTraitement ?? "";
      return db_.localeCompare(da);
    });
    for (const d of sorted) {
      const num = redactDsNumber(d.number).padEnd(18);
      const traite = (d.dateTraitement ?? "?").padEnd(26);
      const email = redactEmail(d.usager?.email ?? null);
      console.log(`  ${num} | ${traite} | ${email}`);
    }
  }

  // --- CSV optionnel ---
  if (CSV_PATH) {
    const header = [
      "parcoursId",
      "userEmail",
      "userEmailContact",
      "userNom",
      "userPrenom",
      "currentStep",
      "currentStatus",
      "parcoursCreatedAt",
      "parcoursUpdatedAt",
      "archivedAt",
      "anomalies",
      "localDossiers",
      "amoStatut",
      "amoEntreprise",
      "amoUserEmail",
      "amoChoisieAt",
      "commentairesCount",
      "emailsToSearch",
      "dsEligibiliteMatches",
      "dsDiagnosticMatches",
      "dsDevisMatches",
      "dsFacturesMatches",
    ].join(",");
    const rows = reports.map((r) => {
      const fmt = (s: Step) => {
        const v = r.dsSearch[s];
        if (v === "skipped") return "skipped";
        if (v === "error") return "error";
        if (!v) return "";
        return v.map((h) => `${redactDsNumber(h.dossierNumber)}(${h.state}/${h.matchedOn ?? "?"})`).join("|");
      };
      return [
        redactUuid(r.parcoursId),
        redactEmail(r.userEmail),
        redactEmail(r.userEmailContact),
        ANONYMIZE ? "" : (r.userNom ?? ""),
        ANONYMIZE ? "" : (r.userPrenom ?? ""),
        r.currentStep,
        r.currentStatus,
        r.parcoursCreatedAt.toISOString(),
        r.parcoursUpdatedAt.toISOString(),
        r.archivedAt?.toISOString() ?? "",
        r.anomalies.join(" ; "),
        r.localDossiers
          .map(
            (d) =>
              `${d.step}:${d.dsStatus}:${d.dsNumber ? (ANONYMIZE ? redactDsNumber(Number(d.dsNumber)) : d.dsNumber) : "?"}`
          )
          .join("|"),
        r.amoValidation?.statut ?? "",
        r.amoValidation?.entrepriseAmoNom
          ? ANONYMIZE
            ? `<amo:${shortHash(r.amoValidation.entrepriseAmoNom)}>`
            : r.amoValidation.entrepriseAmoNom
          : "",
        redactEmail(r.amoValidation?.userEmail ?? null),
        r.amoValidation?.choisieAt.toISOString() ?? "",
        String(r.commentaires.length),
        r.emailsToSearch.map(redactEmail).join("|"),
        fmt(Step.ELIGIBILITE),
        fmt(Step.DIAGNOSTIC),
        fmt(Step.DEVIS),
        fmt(Step.FACTURES),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    writeFileSync(CSV_PATH, [header, ...rows].join("\n"), "utf8");
    console.log(`\nCSV écrit : ${CSV_PATH}${ANONYMIZE ? " (anonymisé)" : ""}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log(
    `Audit terminé. ${reports.length} parcours à examiner (dont la majorité sont des cas légitimes — voir le fix pour le tri).`
  );
  console.log("=".repeat(72));

  await client.end();
}

main().catch((err) => {
  console.error("Erreur:", err);
  client.end();
  process.exit(1);
});
