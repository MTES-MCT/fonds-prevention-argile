/**
 * Contrôle l'avis d'imposition de dossiers d'éligibilité et écrit le verdict dans l'annotation
 * privée « Contrôle avis d'imposition ». DRY-RUN par défaut : rien n'est écrit sans --apply.
 *
 * Options :
 *   --dossier=<n>[,<n>]   numéros DN (obligatoire)
 *   --region=<code INSEE> région du logement, pour l'effet d'un écart de revenu sur la tranche
 *   --apply               écrit l'annotation (token en écriture + DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID)
 *   --afficher-valeurs    affiche le texte de l'annotation, qui contient des montants
 *
 * Usage :
 *   pnpm ds:controler-avis-impot --dossier=33301642 --region=32
 *   pnpm ds:controler-avis-impot --dossier=33301642 --region=32 --apply
 */

import "../lib/env";
import { getArg, hasFlag } from "../lib/args";
import { LIBELLES_STATUT_CONTROLE } from "@/features/parcours/dossiers-ds/domain/avis-impot";
import type { IssueAnnotationControle } from "@/features/parcours/dossiers-ds/services/controle-avis-impot.service";

const APPLIQUER = hasFlag("apply");
const AFFICHER_VALEURS = hasFlag("afficher-valeurs");
const REGION = getArg("region") ?? null;

const LIBELLES_ISSUE: Record<IssueAnnotationControle, string> = {
  ecrite: "annotation écrite",
  inchangee: "annotation déjà à jour, rien à écrire",
  simulation: "DRY-RUN, annotation non écrite (ajouter --apply)",
  annotation_non_configuree: "démarche sans id d'annotation connu, rien écrit",
  instructeur_non_configure: "DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID absent, rien écrit",
};

async function main(): Promise<void> {
  const numeros = (getArg("dossier") ?? "").split(",").map((n) => Number(n.trim()));
  if (numeros.some((n) => !Number.isInteger(n) || n <= 0)) {
    console.error("Usage : --dossier=<numéro>[,<numéro>] [--region=<code>] [--apply] [--afficher-valeurs]");
    process.exit(1);
  }

  // Import tardif : le client DN lit l'env à sa construction, après le chargement de dotenv.
  const { controlerEtAnnoterAvisImpot } =
    await import("@/features/parcours/dossiers-ds/services/controle-avis-impot.service");
  console.log(APPLIQUER ? "Mode ÉCRITURE" : "Mode DRY-RUN (aucune écriture DN)");

  for (const numero of numeros) {
    try {
      const controle = await controlerEtAnnoterAvisImpot(numero, { codeRegion: REGION, appliquer: APPLIQUER });
      if (!controle) {
        console.log(`\nDossier ${numero} : introuvable ou invisible (brouillon non déposé ?)`);
        continue;
      }
      console.log(
        `\nDossier ${numero} : ${LIBELLES_STATUT_CONTROLE[controle.resultat.statut]} — ${LIBELLES_ISSUE[controle.issue]}`
      );
      console.log(`      ${controle.texte.length} caractères`);
      if (AFFICHER_VALEURS) console.log(controle.texte.replace(/^/gm, "      "));
    } catch (error) {
      console.log(`\nDossier ${numero} : échec (${error instanceof Error ? error.message : "erreur"})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
