/**
 * Contrôle l'avis d'imposition de dossiers d'éligibilité et écrit le verdict dans l'annotation
 * privée « Contrôle avis d'imposition », comme le CRON. DRY-RUN par défaut : rien n'est écrit,
 * ni dans DN ni en base, sans --apply.
 *
 * Cibles (une des deux) :
 *   --dossier=<n>[,<n>]   numéros DN
 *   --tous                dossiers d'éligibilité déposés et sans décision, sur les démarches activées
 *
 * Options :
 *   --apply               écrit l'annotation et enregistre le verdict en base
 *   --afficher-valeurs    montants et lien carte en clair (masqués par défaut)
 *
 * Usage :
 *   pnpm ds:controler-avis-impot --tous
 *   pnpm ds:controler-avis-impot --dossier=33301642 --apply
 */

// Doit rester le premier import : charge dotenv avant que le client DN ne lise l'env.
import "../lib/env";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  LIBELLES_STATUT_CONTROLE,
  masquerMontants,
  statutAnnotationControle,
} from "@/features/parcours/dossiers-ds/domain/avis-impot";
import { estInstructionAutomatiqueActive } from "@/features/parcours/dossiers-ds/domain/value-objects/ds-annotations";
import {
  controlerEtAnnoterAvisImpot,
  controlerEtEnregistrerAvisImpot,
  type ControleAvisImpotDossier,
  type IssueAnnotationControle,
} from "@/features/parcours/dossiers-ds/services/controle-avis-impot.service";
import { getArg, hasFlag } from "../lib/args";

const APPLIQUER = hasFlag("apply");
const AFFICHER_VALEURS = hasFlag("afficher-valeurs");
const afficher = (texte: string) => (AFFICHER_VALEURS ? texte : masquerMontants(texte));
// Le lien porte l'adresse ou les coordonnées de la maison : on ne dit que sa forme.
const afficherAnnotation = ({ cle, valeur }: { cle: string; valeur: string }) => {
  if (AFFICHER_VALEURS || cle !== "lienCarte") return afficher(valeur);
  return /query=-?\d+(\.\d+)?,-?\d/.test(valeur)
    ? "lien masqué, repère sur le point géocodé"
    : "lien masqué, recherche en texte";
};
const TOUS = hasFlag("tous");
const NUMEROS = (getArg("dossier") ?? "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);
const PAUSE_MS = 150;
const USAGE = "Usage : --dossier=<numéro>[,<numéro>] ou --tous [--apply]";

const LIBELLES_ISSUE: Record<IssueAnnotationControle, string> = {
  ecrite: "annotation écrite",
  inchangee: "annotation déjà à jour",
  simulation: "DRY-RUN, rien écrit",
  annotation_non_configuree: "démarche sans id d'annotation connu, rien écrit",
};

interface Cible {
  dsNumber: string;
  /** Null pour un numéro absent de la base : contrôlé, mais rien à y enregistrer. */
  dossierId: string | null;
}

async function ciblesDepuisBase(): Promise<Cible[]> {
  const perimetre = TOUS
    ? inArray(dossiersDemarchesSimplifiees.dsStatus, [DSStatus.EN_CONSTRUCTION, DSStatus.EN_INSTRUCTION])
    : inArray(dossiersDemarchesSimplifiees.dsNumber, NUMEROS);

  const lignes = await db
    .select({
      dossierId: dossiersDemarchesSimplifiees.id,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dsDemarcheId: dossiersDemarchesSimplifiees.dsDemarcheId,
    })
    .from(dossiersDemarchesSimplifiees)
    .where(
      and(
        eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE),
        isNotNull(dossiersDemarchesSimplifiees.dsNumber),
        perimetre
      )
    );

  const actives = lignes.filter((l) => estInstructionAutomatiqueActive(Number(l.dsDemarcheId)));
  if (actives.length < lignes.length) {
    console.log(`${lignes.length - actives.length} dossier(s) ignoré(s) : contrôle non activé sur leur démarche`);
  }
  const cibles: Cible[] = actives.map((l) => ({ dsNumber: l.dsNumber ?? "", dossierId: l.dossierId }));

  const connus = new Set(lignes.map((l) => l.dsNumber));
  for (const numero of TOUS ? [] : NUMEROS) {
    if (!connus.has(numero)) cibles.push({ dsNumber: numero, dossierId: null });
  }
  return cibles;
}

function controler(cible: Cible): Promise<ControleAvisImpotDossier | null> {
  if (!cible.dossierId) {
    return controlerEtAnnoterAvisImpot(Number(cible.dsNumber), { appliquer: APPLIQUER });
  }
  return controlerEtEnregistrerAvisImpot({
    dossierId: cible.dossierId,
    dsNumber: cible.dsNumber,
    appliquer: APPLIQUER,
  });
}

async function main(): Promise<void> {
  if (!TOUS && (NUMEROS.length === 0 || NUMEROS.some((n) => !/^\d+$/.test(n)))) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  console.log(APPLIQUER ? "Mode ÉCRITURE (DN + base)" : "Mode DRY-RUN (aucune écriture)");

  const cibles = await ciblesDepuisBase();
  console.log(`${cibles.length} dossier(s) à contrôler`);
  const bilan = new Map<string, number>();
  const compter = (cle: string) => bilan.set(cle, (bilan.get(cle) ?? 0) + 1);

  for (const cible of cibles) {
    const horsBase = cible.dossierId ? "" : " (absent de la base, rien enregistré)";
    try {
      const controle = await controler(cible);
      if (!controle) {
        console.log(`\nDossier ${cible.dsNumber} : introuvable ou invisible côté DN`);
        compter("invisible");
      } else {
        const statut = LIBELLES_STATUT_CONTROLE[statutAnnotationControle(controle.resultat)];
        console.log(`\nDossier ${cible.dsNumber} : ${statut} — ${LIBELLES_ISSUE[controle.issue]}${horsBase}`);
        if (controle.annotations.length === 0) console.log(`      « ${afficher(controle.texte)} »`);
        for (const annotation of controle.annotations) {
          console.log(`      ${annotation.nom} : « ${afficherAnnotation(annotation)} »`);
        }
        compter(statut);
      }
    } catch (error) {
      console.log(`\nDossier ${cible.dsNumber} : échec (${error instanceof Error ? error.message : "erreur"})`);
      compter("échec");
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }

  console.log(`\nBilan : ${[...bilan].map(([cle, n]) => `${cle} ${n}`).join(", ") || "rien"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => rawClient.end());
