/**
 * Reprend dans FPA le mandat financier déclaré dans DN (« Mandataire administratif et financier »).
 *
 * Le CRON fait déjà cette lecture pour les parcours actifs ; ce script couvre en plus les parcours
 * archivés ou complétés, qu'il ne visite pas. Il ne remplit que les NULL, jamais une réponse déjà
 * donnée, et n'écrit que `true` : « administratif » est la valeur préremplie par défaut.
 *
 * Usage
 *   pnpm ds:rattraper-mandat-financier            # dry-run
 *   pnpm ds:rattraper-mandat-financier --apply
 *
 * Seuls des identifiants de parcours sont affichés, jamais de donnée du demandeur.
 */

import "../lib/env";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { dossiersDemarchesSimplifiees, parcoursAmoValidations } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects/statutValidation";
import { renseignerMandatFinancierSiInconnu } from "@/features/parcours/amo/services/mandat-financier.service";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { estMandatFinancierDeclareDansDn } from "@/features/parcours/dossiers-ds/domain/mandat-financier-dn";
import { hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`MANDAT FINANCIER DEPUIS DN — ${APPLY ? "APPLY (écriture)" : "DRY-RUN (aucune écriture)"}`);

  const candidats = await db
    .select({ parcoursId: parcoursAmoValidations.parcoursId, dsNumber: dossiersDemarchesSimplifiees.dsNumber })
    .from(parcoursAmoValidations)
    .innerJoin(
      dossiersDemarchesSimplifiees,
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursAmoValidations.parcoursId),
        eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE)
      )
    )
    .where(
      and(
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
        isNull(parcoursAmoValidations.estMandataireFinancier),
        isNotNull(dossiersDemarchesSimplifiees.dsNumber)
      )
    );

  console.log(`${candidats.length} dossier(s) d'éligibilité à lire dans DN.`);
  let financiers = 0;
  let ecrits = 0;
  let erreurs = 0;

  for (const { parcoursId, dsNumber } of candidats) {
    try {
      const dn = await graphqlClient.getDossierStatus(Number(dsNumber));
      if (estMandatFinancierDeclareDansDn(dn?.reponseMandataire)) {
        financiers += 1;
        console.log(`  FINANCIER ${parcoursId}`);
        if (APPLY && (await renseignerMandatFinancierSiInconnu(parcoursId))) ecrits += 1;
      }
    } catch {
      erreurs += 1;
      console.log(`  ERREUR    ${parcoursId} (lecture DN impossible, ignoré)`);
    }
    await sleep(150);
  }

  console.log(
    `Déclarés financiers dans DN : ${financiers}${APPLY ? `, mis à jour : ${ecrits}` : " (relancer avec --apply)"}, erreurs : ${erreurs}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => rawClient.end());
