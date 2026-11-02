/**
 * Fusionne un dossier créé par un agent (stub jamais réclamé) dans le compte FranceConnect
 * que le demandeur possédait déjà.
 *
 * Contexte
 * --------
 * Un agent qui ne retrouve pas un demandeur dans sa liste lui crée un nouveau dossier et
 * l'invite. Si le demandeur avait déjà un compte FranceConnect, le rattachement est
 * impossible (un `fc_id` par compte) : il continue de se connecter sur l'ancien, et le travail
 * de l'agent reste sur un dossier que personne n'ouvrira.
 *
 * Le compte FranceConnect est conservé : c'est le seul où le demandeur peut se connecter.
 *   - les actions du dossier invité (appels, messages, relances) y sont déplacées ;
 *   - la simulation de l'agent y est copiée, si le compte n'en a pas déjà une ;
 *   - le téléphone saisi par l'agent est repris si le compte n'en a pas ;
 *   - le compte invité est supprimé (parcours, validation et jetons partent en cascade).
 *
 * La validation AMO du compte n'est PAS modifiée : la décision reste à l'AMO, qui ré-ouvre
 * ou accepte depuis l'espace agent (audit, mails et changement d'étape habituels).
 *
 * Usage
 *   pnpm fix:fusionner-invite --invite=<parcoursId> --compte=<parcoursId>            # dry-run
 *   pnpm fix:fusionner-invite --invite=<parcoursId> --compte=<parcoursId> --apply
 *   ... --adresses-differentes   # seulement après vérification : les adresses ne concordent pas
 *
 * NB : action ops, sans entrée d'audit `parcours_actions` (comme `fix:detacher-amo`). La
 * sortie du script fait foi, la conserver. Aucune donnée nominative n'y est affichée.
 */

import "../lib/env";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import {
  dossiersDemarchesSimplifiees,
  dossiersDsTentatives,
  entreprisesAmo,
  parcoursActions,
  parcoursAmoValidations,
  parcoursPrevention,
  prospectQualifications,
  users,
} from "@/shared/database/schema";
import { getServerEnv } from "@/shared/config/env.config";
import { getArg, hasFlag } from "../lib/args";
import { motifsDeRefusFusion } from "../lib/fusion-invite";

const APPLY = hasFlag("apply");
const INVITE_ID = getArg("invite");
const COMPTE_ID = getArg("compte");
const ADRESSES_DIFFERENTES = hasFlag("adresses-differentes");

const line = () => console.log("-".repeat(90));

async function chargerParcours(parcoursId: string) {
  const [row] = await db
    .select({ parcours: parcoursPrevention, user: users })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(eq(parcoursPrevention.id, parcoursId))
    .limit(1);
  if (!row) return null;

  const [validation] = await db
    .select({ id: parcoursAmoValidations.id, statut: parcoursAmoValidations.statut, amo: entreprisesAmo.nom })
    .from(parcoursAmoValidations)
    .leftJoin(entreprisesAmo, eq(entreprisesAmo.id, parcoursAmoValidations.entrepriseAmoId))
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  const compter = async (table: typeof parcoursActions | typeof prospectQualifications) => {
    const [r] = await db.select({ n: count() }).from(table).where(eq(table.parcoursId, parcoursId));
    return r.n;
  };
  const [[dossiers], [tentatives]] = await Promise.all([
    db
      .select({ n: count() })
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId)),
    db.select({ n: count() }).from(dossiersDsTentatives).where(eq(dossiersDsTentatives.parcoursId, parcoursId)),
  ]);

  return {
    ...row,
    validation: validation ?? null,
    nbActions: await compter(parcoursActions),
    nbQualifications: await compter(prospectQualifications),
    nbDossiersDn: dossiers.n + tentatives.n,
  };
}

type Dossier = NonNullable<Awaited<ReturnType<typeof chargerParcours>>>;

function decrire(libelle: string, d: Dossier) {
  const validation = d.validation ? `${d.validation.statut} (${d.validation.amo ?? "sans AMO"})` : "aucune";
  console.log(`${libelle} — parcours ${d.parcours.id}`);
  console.log(`  étape          : ${d.parcours.currentStep} / ${d.parcours.currentStatus}`);
  console.log(`  archivé        : ${d.parcours.archivedAt ? "oui" : "non"}`);
  console.log(`  FranceConnect  : ${d.user.fcId ? "oui" : "non"}`);
  console.log(`  validation AMO : ${validation}`);
  console.log(
    `  simulations    : demandeur ${d.parcours.rgaSimulationData ? "oui" : "non"}, agent ${d.parcours.rgaSimulationDataAgent ? "oui" : "non"}`
  );
  console.log(
    `  actions        : ${d.nbActions}, qualifications : ${d.nbQualifications}, formulaires DN : ${d.nbDossiersDn}`
  );
}

async function main() {
  line();
  console.log(`FUSION D'UN DOSSIER INVITÉ — ${APPLY ? "APPLY (écriture)" : "DRY-RUN (aucune écriture)"}`);
  line();

  if (!INVITE_ID || !COMPTE_ID) {
    console.error("Usage : --invite=<parcoursId> --compte=<parcoursId> [--apply]");
    process.exitCode = 1;
    return;
  }

  const [invite, compte] = await Promise.all([chargerParcours(INVITE_ID), chargerParcours(COMPTE_ID)]);
  if (!invite || !compte) {
    console.error(`Parcours introuvable : ${!invite ? INVITE_ID : COMPTE_ID}`);
    process.exitCode = 1;
    return;
  }

  decrire("Dossier invité", invite);
  decrire("Compte FranceConnect", compte);
  console.log();

  const motifs = motifsDeRefusFusion({
    invite: {
      parcoursId: invite.parcours.id,
      fcId: invite.user.fcId,
      claimedAt: invite.user.claimedAt,
      currentStep: invite.parcours.currentStep,
      nbDossiersDn: invite.nbDossiersDn,
      nbQualifications: invite.nbQualifications,
      adresse: invite.parcours.rgaSimulationDataAgent?.logement?.adresse ?? null,
    },
    compte: {
      parcoursId: compte.parcours.id,
      fcId: compte.user.fcId,
      adresse:
        compte.parcours.rgaSimulationData?.logement?.adresse ??
        compte.parcours.rgaSimulationDataAgent?.logement?.adresse ??
        null,
    },
    adressesDifferentesAcceptees: ADRESSES_DIFFERENTES,
  });
  if (motifs.length > 0) {
    console.log("Fusion refusée :");
    for (const m of motifs) console.log(`  - ${m}`);
    process.exitCode = 1;
    return;
  }

  const copierSimulation = !!invite.parcours.rgaSimulationDataAgent && !compte.parcours.rgaSimulationDataAgent;
  const reprendreTelephone = !!invite.user.telephone && !compte.user.telephone;

  console.log("Plan :");
  console.log(`  - déplacer ${invite.nbActions} action(s) vers le compte FranceConnect`);
  console.log(
    copierSimulation
      ? "  - copier la simulation de l'agent (baseline : simulation du demandeur)"
      : "  - simulation de l'agent non copiée (absente du dossier invité, ou déjà présente sur le compte)"
  );
  if (reprendreTelephone) console.log("  - reprendre le téléphone saisi par l'agent");
  if (invite.user.email?.toLowerCase() !== compte.user.emailContact?.toLowerCase()) {
    console.log("  - (non modifié) l'email saisi par l'agent diffère de l'email de contact du compte : à vérifier");
  }
  console.log("  - supprimer le compte invité, son parcours et sa validation");

  if (!APPLY) {
    console.log();
    console.log("Dry-run : relancer avec --apply pour écrire.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(parcoursActions)
      .set({ parcoursId: compte.parcours.id })
      .where(eq(parcoursActions.parcoursId, invite.parcours.id));

    if (copierSimulation) {
      await tx
        .update(parcoursPrevention)
        .set({
          rgaSimulationDataAgent: invite.parcours.rgaSimulationDataAgent,
          rgaSimulationAgentEditedAt: invite.parcours.rgaSimulationAgentEditedAt ?? new Date(),
          rgaSimulationAgentEditedBy: invite.parcours.rgaSimulationAgentEditedBy,
          rgaSimulationDataAgentBaseline:
            compte.parcours.rgaSimulationDataAgentBaseline ?? compte.parcours.rgaSimulationData,
        })
        .where(eq(parcoursPrevention.id, compte.parcours.id));
    }

    if (reprendreTelephone) {
      await tx
        .update(users)
        .set({ telephone: invite.user.telephone })
        .where(and(eq(users.id, compte.user.id), isNull(users.telephone)));
    }

    // Garde redondante : ne supprime qu'un stub jamais réclamé, même si l'état a bougé depuis la lecture.
    const supprimes = await tx
      .delete(users)
      .where(and(eq(users.id, invite.user.id), isNull(users.fcId), isNull(users.claimedAt)))
      .returning({ id: users.id });
    if (supprimes.length !== 1) throw new Error("Le compte invité a changé pendant la fusion : rien n'est écrit.");
  });

  const lien = compte.validation
    ? `${getServerEnv().BASE_URL}/espace-agent/dossiers/${compte.validation.id}`
    : `${getServerEnv().BASE_URL}/espace-agent/dossiers/${compte.parcours.id}`;
  console.log();
  console.log("Fusion faite. Suite côté AMO, depuis le dossier du compte FranceConnect :");
  console.log(`  ${lien}`);
  console.log("  « Ré-ouvrir la demande » si elle est refusée, puis accepter depuis l'écran de la demande.");
  console.log("  Le demandeur doit se reconnecter s'il a une session ouverte.");
}

main()
  .catch((error) => {
    // Le message d'une requête Drizzle en échec contient ses paramètres, donc des données nominatives.
    const message =
      error instanceof Error && !error.message.startsWith("Failed query") ? error.message : "requête en échec";
    console.error("Échec :", message);
    process.exitCode = 1;
  })
  .finally(() => rawClient.end());
