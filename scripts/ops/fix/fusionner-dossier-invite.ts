// Fusionne un dossier invité jamais réclamé dans le compte FranceConnect du même demandeur, ou le supprime (ADR-0050).
// Usage et garde-fous : scripts/ops/README.md § fusionner-dossier-invite. Dry-run par défaut.

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
import { resumerErreur } from "@/shared/utils/erreur.utils";
import { getArg, hasFlag } from "../lib/args";
import {
  motifsDeRefusFusion,
  planFusion,
  type EtatFusionInvite,
  type ModeFusion,
  type PlanFusion,
} from "../lib/fusion-invite";

const APPLY = hasFlag("apply");
const INVITE_ID = getArg("invite");
const COMPTE_ID = getArg("compte");
const ADRESSES_DIFFERENTES = hasFlag("adresses-differentes");
const AVEC_QUALIFICATIONS = hasFlag("avec-qualifications");
const MODE: ModeFusion = hasFlag("supprimer-seulement") ? "suppression" : "fusion";

type Executeur = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const line = () => console.log("-".repeat(90));

// Les URL de l'espace agent portent un id de validation ou de parcours : on accepte les deux.
async function resoudreParcoursId(exec: Executeur, id: string): Promise<string> {
  const [validation] = await exec
    .select({ parcoursId: parcoursAmoValidations.parcoursId })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.id, id))
    .limit(1);
  return validation?.parcoursId ?? id;
}

/** Avec `verrouiller`, parcours et compte restent figés jusqu'à la fin de la transaction, enfants compris. */
async function chargerParcours(exec: Executeur, id: string, verrouiller: boolean) {
  const parcoursId = await resoudreParcoursId(exec, id);
  const requete = exec
    .select({ parcours: parcoursPrevention, user: users })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(eq(parcoursPrevention.id, parcoursId))
    .limit(1);
  const [row] = verrouiller ? await requete.for("update") : await requete;
  if (!row) return null;

  const [validation] = await exec
    .select({ id: parcoursAmoValidations.id, statut: parcoursAmoValidations.statut, amo: entreprisesAmo.nom })
    .from(parcoursAmoValidations)
    .leftJoin(entreprisesAmo, eq(entreprisesAmo.id, parcoursAmoValidations.entrepriseAmoId))
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  const compter = async (
    table: typeof parcoursActions | typeof prospectQualifications | typeof dossiersDsTentatives
  ): Promise<number> => {
    const [r] = await exec.select({ n: count() }).from(table).where(eq(table.parcoursId, parcoursId));
    return r.n;
  };
  const [dossiers] = await exec
    .select({ n: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId));

  return {
    ...row,
    validation: validation ?? null,
    nbActions: await compter(parcoursActions),
    nbQualifications: await compter(prospectQualifications),
    nbDossiersDn: dossiers.n + (await compter(dossiersDsTentatives)),
  };
}

type Dossier = NonNullable<Awaited<ReturnType<typeof chargerParcours>>>;

function etatFusion(invite: Dossier, compte: Dossier): EtatFusionInvite {
  return {
    mode: MODE,
    avecQualifications: AVEC_QUALIFICATIONS,
    invite: {
      parcoursId: invite.parcours.id,
      fcId: invite.user.fcId,
      claimedAt: invite.user.claimedAt,
      currentStep: invite.parcours.currentStep,
      nbDossiersDn: invite.nbDossiersDn,
      nbQualifications: invite.nbQualifications,
      simulationAgent: invite.parcours.rgaSimulationDataAgent,
    },
    compte: {
      parcoursId: compte.parcours.id,
      fcId: compte.user.fcId,
      nbDossiersDn: compte.nbDossiersDn,
      simulationDemandeur: compte.parcours.rgaSimulationData,
      simulationAgent: compte.parcours.rgaSimulationDataAgent,
    },
    adressesDifferentesAcceptees: ADRESSES_DIFFERENTES,
  };
}

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

function afficherPlanFusion(invite: Dossier, compte: Dossier, plan: PlanFusion, reprendreTelephone: boolean) {
  console.log(`  - déplacer ${invite.nbActions} action(s) vers le compte FranceConnect`);
  if (plan.deplacerQualifications) {
    console.log(`  - déplacer ${invite.nbQualifications} qualification(s) Aller-vers vers le compte FranceConnect`);
  }
  if (!plan.copierSimulation) {
    console.log(
      "  - simulation de l'agent non copiée (absente, incomplète face à celle du demandeur, ou déjà présente)"
    );
  } else if (plan.promouvoirSimulation) {
    console.log("  - copier la simulation de l'agent, qui devient aussi celle du compte (il n'en avait aucune)");
  } else {
    console.log("  - copier la simulation de l'agent (baseline : simulation du demandeur)");
  }
  if (reprendreTelephone) console.log("  - reprendre le téléphone saisi par l'agent");
  if (invite.user.email?.toLowerCase() !== compte.user.emailContact?.toLowerCase()) {
    console.log("  - (non modifié) l'email saisi par l'agent diffère de l'email de contact du compte : à vérifier");
  }
  console.log("  - supprimer le compte invité, son parcours et sa validation");
}

class FusionRefusee extends Error {}

async function main() {
  line();
  const titre = MODE === "fusion" ? "FUSION" : "SUPPRESSION";
  console.log(`${titre} D'UN DOSSIER INVITÉ — ${APPLY ? "APPLY (écriture)" : "DRY-RUN (aucune écriture)"}`);
  line();

  if (!INVITE_ID || !COMPTE_ID) {
    console.error("Usage : --invite=<id> --compte=<id> [--apply] (id de parcours ou de validation)");
    process.exitCode = 1;
    return;
  }
  if (MODE === "suppression" && AVEC_QUALIFICATIONS) {
    console.error("--supprimer-seulement ne reprend rien : il exclut --avec-qualifications.");
    process.exitCode = 1;
    return;
  }

  const [invite, compte] = await Promise.all([
    chargerParcours(db, INVITE_ID, false),
    chargerParcours(db, COMPTE_ID, false),
  ]);
  if (!invite || !compte) {
    console.error(`Parcours introuvable : ${!invite ? INVITE_ID : COMPTE_ID}`);
    process.exitCode = 1;
    return;
  }

  decrire("Dossier invité", invite);
  decrire("Compte FranceConnect", compte);
  console.log();

  const motifs = motifsDeRefusFusion(etatFusion(invite, compte));
  if (motifs.length > 0) {
    console.log(`${MODE === "fusion" ? "Fusion" : "Suppression"} refusée :`);
    for (const m of motifs) console.log(`  - ${m}`);
    process.exitCode = 1;
    return;
  }

  const plan = planFusion(etatFusion(invite, compte));
  const reprendreTelephone = MODE === "fusion" && !!invite.user.telephone && !compte.user.telephone;

  console.log("Plan :");
  if (MODE === "suppression") {
    console.log(
      `  - supprimer le dossier invité, ses ${invite.nbActions} action(s), ${invite.nbQualifications} qualification(s) et sa validation`
    );
    console.log("  - rien n'est repris sur le compte FranceConnect : recopier d'abord ce qui doit rester");
  } else {
    afficherPlanFusion(invite, compte, plan, reprendreTelephone);
  }

  if (!APPLY) {
    console.log();
    console.log("Dry-run : relancer avec --apply pour écrire.");
    return;
  }

  await db.transaction(async (tx) => {
    // Relu sous verrou : un agent a pu corriger la cible ou qualifier le stub depuis le dry-run.
    const inviteVerrouille = await chargerParcours(tx, invite.parcours.id, true);
    const compteVerrouille = await chargerParcours(tx, compte.parcours.id, true);
    if (!inviteVerrouille || !compteVerrouille) throw new FusionRefusee("un des deux parcours a disparu");
    const etat = etatFusion(inviteVerrouille, compteVerrouille);
    const motifsActuels = motifsDeRefusFusion(etat);
    if (motifsActuels.length > 0) throw new FusionRefusee(motifsActuels.join(" "));
    const { deplacerActions, deplacerQualifications, copierSimulation, promouvoirSimulation } = planFusion(etat);
    const source = inviteVerrouille.parcours;

    if (deplacerActions) {
      await tx
        .update(parcoursActions)
        .set({ parcoursId: compteVerrouille.parcours.id })
        .where(eq(parcoursActions.parcoursId, source.id));
    }

    if (deplacerQualifications) {
      await tx
        .update(prospectQualifications)
        .set({ parcoursId: compteVerrouille.parcours.id })
        .where(eq(prospectQualifications.parcoursId, source.id));
    }

    if (copierSimulation) {
      await tx
        .update(parcoursPrevention)
        .set({
          rgaSimulationDataAgent: source.rgaSimulationDataAgent,
          rgaSimulationAgentEditedAt: source.rgaSimulationAgentEditedAt ?? new Date(),
          rgaSimulationAgentEditedBy: source.rgaSimulationAgentEditedBy,
          rgaSimulationDataAgentBaseline:
            compteVerrouille.parcours.rgaSimulationDataAgentBaseline ?? compteVerrouille.parcours.rgaSimulationData,
          ...(promouvoirSimulation ? { rgaSimulationData: source.rgaSimulationDataAgent } : {}),
        })
        .where(eq(parcoursPrevention.id, compteVerrouille.parcours.id));
    }

    if (MODE === "fusion" && inviteVerrouille.user.telephone && !compteVerrouille.user.telephone) {
      await tx
        .update(users)
        .set({ telephone: inviteVerrouille.user.telephone })
        .where(and(eq(users.id, compteVerrouille.user.id), isNull(users.telephone)));
    }

    const supprimes = await tx
      .delete(users)
      .where(and(eq(users.id, inviteVerrouille.user.id), isNull(users.fcId), isNull(users.claimedAt)))
      .returning({ id: users.id });
    if (supprimes.length !== 1) throw new FusionRefusee("le compte invité a changé pendant la fusion");
  });

  // Permalien du parcours : la page redirige vers dossier, demande ou prospect selon l'état (ADR-0025).
  const lien = `${getServerEnv().BASE_URL}/espace-agent/dossiers/${compte.parcours.id}`;
  console.log();
  if (MODE === "suppression") {
    console.log("Dossier invité supprimé. Le compte FranceConnect n'a pas changé :");
    console.log(`  ${lien}`);
    return;
  }
  console.log("Fusion faite. Suite côté AMO, depuis le dossier du compte FranceConnect :");
  console.log(`  ${lien}`);
  console.log("  « Ré-ouvrir la demande » si elle est refusée, puis accepter depuis l'écran de la demande.");
  console.log("  Le demandeur doit se reconnecter s'il a une session ouverte.");
}

main()
  .catch((error) => {
    const message =
      error instanceof FusionRefusee ? `refusé, rien n'est écrit : ${error.message}` : resumerErreur(error);
    console.error("Échec :", message);
    process.exitCode = 1;
  })
  .finally(() => rawClient.end());
