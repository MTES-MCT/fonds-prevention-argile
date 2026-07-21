/**
 * Met en lien avec l'AMO les dossiers bloqués en « choix AMO » dans un département à
 * AMO obligatoire (ou AV/AMO fusionnés) : dossiers validés par un Aller-vers
 * (situation_particulier = eligible) mais sans `parcours_amo_validations`, donc que
 * l'AMO ne peut pas prendre en charge (aucune demande d'accompagnement).
 *
 * Contexte
 * --------
 * Historiquement, l'auto-attribution de l'AMO unique en département obligatoire n'était
 * déclenchée QUE lorsque le ménage ouvrait `/mon-compte`. Un dossier qualifié par
 * l'Aller-vers dont le ménage ne s'est jamais reconnecté restait sans lien AMO. Le
 * correctif applicatif (hook dans `qualifyProspect`) règle les nouveaux cas ; ce script
 * rattrape les dossiers déjà bloqués.
 *
 * Mince wrapper CLI autour du service `assignAmoAutomatiqueForUser` (le même que celui
 * appelé côté /mon-compte et désormais à la qualification Aller-vers). Idempotent :
 * no-op si une validation existe déjà ou si l'étape n'est plus `choix_amo`.
 *
 * Effet de l'auto-attribution : crée une `parcours_amo_validations` (statut `en_attente`,
 * attributionMode `auto_obligatoire` / `auto_av_amo`), génère le token, envoie l'email à
 * l'AMO, passe le parcours en `en_instruction`. L'AMO peut alors valider l'éligibilité.
 *
 * Niveaux d'engagement
 *   (rien)     dry-run : liste / diagnostic, aucune écriture
 *   --apply    applique l'auto-attribution
 *
 * Ciblage
 *   (aucun)                inventaire : tous les dossiers bloqués éligibles à ce rattrapage
 *   --parcours-id=<uuid>   cible un parcours précis (recommandé en prod pour un dossier donné)
 *
 * Usage
 *   pnpm fix:lier-amo-oblig                              # inventaire (dry-run)
 *   pnpm fix:lier-amo-oblig --apply                      # corrige TOUS les dossiers listés
 *   pnpm fix:lier-amo-oblig --parcours-id=<uuid>         # diagnostic d'un dossier (dry-run)
 *   pnpm fix:lier-amo-oblig --parcours-id=<uuid> --apply # corrige ce dossier
 *
 * NB : action ops (pas un agent connecté) — pas d'entrée d'audit `parcours_actions`.
 * Pré-requis : .env.local (ou vars Scalingo) avec la config DB.
 */

import "../lib/env";
import { and, eq, isNull } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { parcoursPrevention, parcoursAmoValidations, users } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { assignAmoAutomatiqueForUser } from "@/features/parcours/amo/services/amo-selection.service";
import { getAmoMode, isAmoAttributionAutomatique } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");

function line() {
  console.log("=".repeat(72));
}

interface Candidate {
  parcoursId: string;
  userId: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  codeDepartement: string | null;
  mode: string | null;
}

/**
 * Résout le département d'un parcours (user-first, fallback agent) et le mode AMO.
 */
function resolveDept(parcours: typeof parcoursPrevention.$inferSelect): {
  codeDepartement: string | null;
  mode: string | null;
} {
  const codeInsee = normalizeCodeInsee(getDemandeurFirstLogement(parcours)?.commune);
  if (!codeInsee) return { codeDepartement: null, mode: null };
  const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);
  return { codeDepartement, mode: getAmoMode(codeDepartement) };
}

/**
 * Applique l'auto-attribution à un parcours et logue le résultat.
 */
async function applyOne(c: Candidate): Promise<boolean> {
  const result = await assignAmoAutomatiqueForUser(c.userId);
  if (result.success) {
    console.log(
      `  OK   ${c.parcoursId}  ${c.prenom ?? ""} ${c.nom ?? ""}  -> ${result.data.message || "AMO liée (en_attente)"}`
    );
    return true;
  }
  console.error(`  KO   ${c.parcoursId}  ${c.prenom ?? ""} ${c.nom ?? ""}  -> ${result.error}`);
  return false;
}

async function runTargeted(parcoursId: string) {
  const [parcours] = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, parcoursId)).limit(1);

  if (!parcours) {
    console.error("Parcours introuvable.");
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.id, parcours.userId)).limit(1);
  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);
  const { codeDepartement, mode } = resolveDept(parcours);

  console.log(`Parcours    : ${parcoursId}`);
  console.log(`Demandeur   : ${user?.prenom ?? ""} ${user?.nom ?? ""} <${user?.email ?? "?"}>`);
  console.log(`Étape       : ${parcours.currentStep} / ${parcours.currentStatus}`);
  console.log(`Situation   : ${parcours.situationParticulier}`);
  console.log(`Département  : ${codeDepartement ?? "?"} (mode AMO : ${mode ?? "?"})`);
  console.log(
    `Validation  : ${validation ? `${validation.statut} (${validation.attributionMode})` : "<aucune ligne>"}`
  );
  console.log();

  // Garde-fous lisibles (le service re-vérifie de toute façon)
  if (validation) {
    console.error("ABANDON : une validation AMO existe déjà. Rien à faire (le service serait no-op).");
    process.exit(1);
  }
  if (!codeDepartement || !isAmoAttributionAutomatique(codeDepartement)) {
    console.error(
      `ABANDON : département ${codeDepartement ?? "?"} non en attribution automatique (mode ${mode ?? "?"}).`
    );
    console.error("En mode facultatif, le ménage doit choisir lui-même son AMO — pas de rattrapage automatique.");
    process.exit(1);
  }
  if (parcours.currentStep !== Step.CHOIX_AMO) {
    console.error(
      `ABANDON : étape ${parcours.currentStep} ≠ choix_amo. L'auto-attribution ne s'applique qu'à choix_amo.`
    );
    process.exit(1);
  }

  console.log(
    "PLAN : créer la validation AMO (en_attente, auto_*), envoyer l'email AMO, passer le parcours en en_instruction."
  );
  console.log();

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Commande pour appliquer :");
    console.log(`  pnpm fix:lier-amo-oblig --parcours-id=${parcoursId} --apply`);
    return;
  }

  const ok = await applyOne({
    parcoursId,
    userId: parcours.userId,
    prenom: user?.prenom ?? null,
    nom: user?.nom ?? null,
    email: user?.email ?? null,
    codeDepartement,
    mode,
  });
  if (!ok) process.exit(1);
}

async function runInventory() {
  // Dossiers validés par un Aller-vers (situation = eligible), encore en choix_amo,
  // sans validation AMO, ni archivés ni complétés.
  const rows = await db
    .select({
      parcours: parcoursPrevention,
      nom: users.nom,
      prenom: users.prenom,
      email: users.email,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(parcoursPrevention.userId, users.id))
    .leftJoin(parcoursAmoValidations, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .where(
      and(
        eq(parcoursPrevention.currentStep, Step.CHOIX_AMO),
        eq(parcoursPrevention.situationParticulier, SituationParticulier.ELIGIBLE),
        isNull(parcoursAmoValidations.id),
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt)
      )
    );

  // Filtre département en attribution automatique (dépend de la config env + jsonb → côté JS).
  const candidates: Candidate[] = [];
  for (const row of rows) {
    const { codeDepartement, mode } = resolveDept(row.parcours);
    if (codeDepartement && isAmoAttributionAutomatique(codeDepartement)) {
      candidates.push({
        parcoursId: row.parcours.id,
        userId: row.parcours.userId,
        prenom: row.prenom,
        nom: row.nom,
        email: row.email,
        codeDepartement,
        mode,
      });
    }
  }

  console.log(
    `Dossiers bloqués éligibles au rattrapage : ${candidates.length} (sur ${rows.length} sans validation en choix_amo/eligible)`
  );
  console.log();
  for (const c of candidates) {
    console.log(
      `  ${c.parcoursId}  dept ${c.codeDepartement} (${c.mode})  ${c.prenom ?? ""} ${c.nom ?? ""} <${c.email ?? "?"}>`
    );
  }
  console.log();

  if (candidates.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Commandes :");
    console.log("  pnpm fix:lier-amo-oblig --apply                      # tout corriger");
    console.log("  pnpm fix:lier-amo-oblig --parcours-id=<uuid> --apply # un seul");
    return;
  }

  console.log("APPLICATION :");
  let ok = 0;
  let ko = 0;
  for (const c of candidates) {
    if (await applyOne(c)) ok++;
    else ko++;
  }
  console.log();
  console.log(`Terminé : ${ok} liés, ${ko} en échec.`);
}

async function main() {
  line();
  console.log(
    `LIEN AMO OBLIGATOIRE (rattrapage) — ${APPLY ? "APPLY" : "DRY-RUN"}${PARCOURS_ID ? ` — parcours ${PARCOURS_ID}` : " — inventaire"}`
  );
  line();

  if (PARCOURS_ID) {
    await runTargeted(PARCOURS_ID);
  } else {
    await runInventory();
  }

  await rawClient.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  rawClient.end();
  process.exit(1);
});
