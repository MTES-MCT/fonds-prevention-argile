/**
 * Passe en « mandataire financier » les dossiers accompagnés de structures connues pour l'être.
 *
 * Contexte : la question n'est posée à l'AMO que depuis la validation du 2026-07-20. Les dossiers
 * validés avant ont `est_mandataire_financier` à NULL, lu comme « non » : l'AMO payée ne peut
 * pas initier la demande de paiement du diagnostic.
 *
 * Ne touche que les validations `logement_eligible` à NULL, jamais une réponse déjà donnée.
 *
 * Usage
 *   pnpm fix:mandat-financier --siret=78334556400042,38039570700033         # dry-run
 *   pnpm fix:mandat-financier --siret=78334556400042 --apply
 *
 * NB : action ops, pas d'entrée d'audit `parcours_actions`. La sortie du script fait foi.
 */

import "../lib/env";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { entreprisesAmo, parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects/statutValidation";
import { renseignerMandatFinancierSiInconnu } from "@/features/parcours/amo/services/mandat-financier.service";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const SIRETS = (getArg("siret") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  if (SIRETS.length === 0) {
    console.error("Usage : pnpm fix:mandat-financier --siret=<siret>[,<siret>...] [--apply]");
    process.exitCode = 1;
    return;
  }

  console.log(`MANDAT FINANCIER — ${APPLY ? "APPLY (écriture)" : "DRY-RUN (aucune écriture)"}`);

  const entreprises = await db
    .select({ id: entreprisesAmo.id, nom: entreprisesAmo.nom, siret: entreprisesAmo.siret })
    .from(entreprisesAmo)
    .where(inArray(entreprisesAmo.siret, SIRETS));

  const inconnus = SIRETS.filter((s) => !entreprises.some((e) => e.siret === s));
  if (inconnus.length > 0) {
    console.error(`SIRET introuvable(s) : ${inconnus.join(", ")} — rien n'a été modifié.`);
    process.exitCode = 1;
    return;
  }

  let total = 0;
  for (const entreprise of entreprises) {
    const lignes = await db
      .select({ parcoursId: parcoursAmoValidations.parcoursId })
      .from(parcoursAmoValidations)
      .where(
        and(
          eq(parcoursAmoValidations.entrepriseAmoId, entreprise.id),
          eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
          isNull(parcoursAmoValidations.estMandataireFinancier)
        )
      );

    let ecrits = 0;
    if (APPLY) {
      for (const { parcoursId } of lignes) {
        if (await renseignerMandatFinancierSiInconnu(parcoursId)) ecrits += 1;
      }
    }
    total += APPLY ? ecrits : lignes.length;
    console.log(
      `  ${entreprise.nom.padEnd(30)} ${entreprise.siret}  ${APPLY ? `${ecrits} mis à jour` : `${lignes.length} à mettre à jour`}`
    );
  }

  console.log(APPLY ? `Total mis à jour : ${total}` : `Total à mettre à jour : ${total} (relancer avec --apply)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => rawClient.end());
