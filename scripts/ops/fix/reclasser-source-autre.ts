/**
 * Reclasse les demandeurs source_acquisition = 'autre' dont la précision libre
 * correspond à des mots-clés connus, vers une nouvelle valeur d'enum plus précise.
 *
 * Contexte
 * --------
 * De nouvelles options ont été ajoutées à l'enum `SourceAcquisition` (Assurance, Site
 * gouvernemental, ...). Avant leur ajout, ces demandeurs avaient choisi "Autre" et saisi
 * une précision libre correspondant en réalité à l'une de ces nouvelles options (ex: "mon
 * assureur Groupama m'en a parlé", "vu sur service-public.fr"). Ce script les retrouve et
 * les reclasse, en conservant le texte de précision original (contexte utile).
 *
 * Règles de reclassement (déclarées ci-dessous, `REGLES`) :
 *   - Assurance            : assurance, assureur, groupama, maaf, gmf
 *   - Site gouvernemental  : bercy, service public, service-public, ministère,
 *                            gouvernement, état
 *
 * Chaque ligne n'est reclassée qu'une seule fois (les règles sont appliquées dans l'ordre
 * déclaré ; une ligne déjà reclassée par une règle précédente n'est plus `source_acquisition
 * = 'autre'` et ne peut donc plus matcher une règle suivante).
 *
 * Niveaux d'engagement
 *   (rien)     dry-run : liste les correspondances par règle (id, nom, précision), aucune écriture
 *   --apply    reclasse en masse les lignes trouvées, règle par règle
 *
 * Usage
 *   pnpm fix:reclasser-source-autre                # dry-run
 *   pnpm fix:reclasser-source-autre --apply
 *
 * NB : action ops (pas un agent connecté) — pas d'entrée d'audit `parcours_actions`
 * (ce champ vit sur `users`, hors périmètre parcours).
 *
 * Pré-requis :
 *   - .env.local (ou vars Scalingo) avec la config DB
 *   - migration 0041_source_acquisition_new_values appliquée (`pnpm db:migrate`)
 *     avant de lancer --apply, sinon l'écriture échouera (valeur d'enum inconnue en base)
 */

import "../lib/env";
import { and, eq, or, ilike } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { users } from "@/shared/database/schema";
import { SourceAcquisition } from "@/shared/domain/value-objects/source-acquisition.enum";
import { hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");

interface RegleReclassement {
  cible: SourceAcquisition;
  label: string;
  termes: string[];
}

const REGLES: RegleReclassement[] = [
  {
    cible: SourceAcquisition.ASSURANCE,
    label: "Assurance",
    termes: ["assurance", "assureur", "groupama", "maaf", "gmf"],
  },
  {
    cible: SourceAcquisition.SITE_GOUVERNEMENTAL,
    label: "Site gouvernemental",
    termes: ["bercy", "service public", "service-public", "ministère", "gouvernement", "état"],
  },
];

function line() {
  console.log("=".repeat(72));
}

async function appliquerRegle(regle: RegleReclassement) {
  console.log(`--- Règle "${regle.label}" -> "${regle.cible}" ---`);
  console.log(`Termes recherchés (insensible à la casse) : ${regle.termes.join(", ")}`);
  console.log();

  const matchesTermes = or(...regle.termes.map((terme) => ilike(users.sourceAcquisitionPrecision, `%${terme}%`)));
  const condition = and(eq(users.sourceAcquisition, SourceAcquisition.AUTRE), matchesTermes);

  const candidats = await db
    .select({
      id: users.id,
      prenom: users.prenom,
      nom: users.nom,
      email: users.email,
      sourceAcquisitionPrecision: users.sourceAcquisitionPrecision,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(condition)
    .orderBy(users.createdAt);

  if (candidats.length === 0) {
    console.log("Aucun demandeur trouvé avec ces critères.");
    console.log();
    return;
  }

  console.log(`${candidats.length} demandeur(s) trouvé(s) :`);
  console.log();
  for (const c of candidats) {
    console.log(`  ${c.id}  ${c.prenom ?? ""} ${c.nom ?? ""} <${c.email ?? "?"}>  (${c.createdAt.toISOString()})`);
    console.log(`    précision actuelle : "${c.sourceAcquisitionPrecision}"`);
  }
  console.log();

  if (!APPLY) {
    console.log();
    return;
  }

  const ids = candidats.map((c) => c.id);
  const updated = await db
    .update(users)
    .set({ sourceAcquisition: regle.cible })
    .where(condition)
    .returning({ id: users.id });

  console.log(`OK — ${updated.length} demandeur(s) reclassé(s) en "${regle.cible}".`);
  if (updated.length !== ids.length) {
    console.warn(
      `ATTENTION : ${ids.length} candidats identifiés mais ${updated.length} mis à jour (état modifié entre-temps ?).`
    );
  }
  console.log();
}

async function main() {
  line();
  console.log(`RECLASSEMENT SOURCE "AUTRE" — ${APPLY ? "APPLY" : "DRY-RUN"}`);
  line();
  console.log();

  for (const regle of REGLES) {
    await appliquerRegle(regle);
  }

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Commande pour appliquer :");
    console.log("  pnpm fix:reclasser-source-autre --apply");
  }

  line();
  await rawClient.end();
}

main().catch(async (err) => {
  console.error("Erreur fatale :", err);
  await rawClient.end();
  process.exit(1);
});
