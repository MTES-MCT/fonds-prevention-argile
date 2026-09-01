/**
 * Prépare une session de tests manuels : « avec CE compte, sur QUEL dossier ? ».
 *
 * Le point de départ est le compte dont on a les identifiants (`--agent=<email>`). Le
 * script résout son périmètre réel via `getDossiersByAgent` — le service du listing de
 * l'espace agent — puis classe ce qu'il voit par scénario de test, avec l'URL directe.
 *
 * Pourquoi passer par le service et non par du SQL : la visibilité d'un agent dépend du
 * scope territorial ET du responsable du dossier (cf. RBAC-ROLES §5 et §6). Une requête
 * indépendante diverge au premier cas tordu et annonce des dossiers en 404. Ici, si le
 * script le liste, l'agent le voit.
 *
 * Lecture seule : aucune écriture, relançable autant que nécessaire (et il le faut —
 * dérouler la checklist consomme les cas : un prospect qualifié n'est plus « à qualifier »).
 *
 * Vie privée : aucun nom, email ou téléphone de demandeur en sortie. Un parcours est
 * identifié par son id et sa commune, ce qui suffit pour naviguer. Les emails d'agents,
 * eux, sont affichés : ce sont des comptes professionnels, et c'est l'objet du script.
 *
 * Usage
 *   pnpm qa:cas-de-test --comptes                        # quels comptes existent, et que voient-ils
 *   pnpm qa:cas-de-test --agent=prenom.nom@structure.fr  # les cas de test de ce compte
 *   pnpm qa:cas-de-test --agent=... --markdown           # checklist collable dans Notion
 *   pnpm qa:cas-de-test --agent=... --scenario=dossier-archive --limit=5
 *
 * Prérequis : .env.local (ou vars Scalingo) avec la config DB. Sur staging, lancer dans
 * un conteneur one-off (cf. « Exécution sur Scalingo » du README ops).
 */

import "../lib/env";
import { inArray, and } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { rawClient } from "@/shared/database/client";
import { parcoursActions } from "@/shared/database/schema";
import { agentsRepo, entreprisesAmoRepo, allersVersRepository } from "@/shared/database/repositories";
import { getDossiersByAgent } from "@/features/backoffice/espace-agent/dossiers/services/dossiers-territoire.service";
import { resolveEspaceAgentPath } from "@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { ACTION_TYPES_SYSTEME } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { getServerEnv } from "@/shared/config/env.config";
import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types/dossiers-territoire.types";
import type { Agent } from "@/shared/database/schema/agents";
import { SCENARIOS, type Scenario, type ScenarioContext } from "./scenarios";
import { getArg, getNumberArg, hasFlag } from "../lib/args";

const AGENT_EMAIL = getArg("agent");
const SCENARIO_ID = getArg("scenario");
const LIMIT = getNumberArg("limit", 3, 1);
const MARKDOWN = hasFlag("markdown");
const COMPTES = hasFlag("comptes");

function line() {
  console.log("=".repeat(78));
}

/** Structure de rattachement de l'agent, pour savoir de quel périmètre on parle. */
async function describeStructure(agent: Agent): Promise<string> {
  if (agent.entrepriseAmoId) {
    const entreprise = await entreprisesAmoRepo.findById(agent.entrepriseAmoId);
    return `AMO ${entreprise?.nom ?? agent.entrepriseAmoId}`;
  }
  if (agent.allersVersId) {
    const av = await allersVersRepository.findById(agent.allersVersId);
    return `Aller-vers ${av?.nom ?? agent.allersVersId}`;
  }
  return "sans structure";
}

/** Parcours (parmi ceux fournis) portant déjà au moins une action système. */
async function findParcoursAvecActionSysteme(parcoursIds: string[]): Promise<Set<string>> {
  if (parcoursIds.length === 0) return new Set();

  const rows = await db
    .select({ parcoursId: parcoursActions.parcoursId })
    .from(parcoursActions)
    .where(
      and(
        inArray(parcoursActions.parcoursId, parcoursIds),
        inArray(parcoursActions.actionType, [...ACTION_TYPES_SYSTEME])
      )
    );

  return new Set(rows.map((r) => r.parcoursId));
}

/** Repère non nominatif du dossier : où il est, et pourquoi il satisfait la précondition. */
function resume(d: DossierItem): string {
  const lieu = [d.logement.commune, d.logement.codeDepartement].filter(Boolean).join(" ");
  const etat = [
    `étape ${d.currentStep}/${d.currentStatus}`,
    `état ${d.etat}`,
    d.validation ? `validation ${d.validation.statut}` : "sans validation AMO",
    d.archivedAt ? "archivé" : "actif",
  ].join(", ");
  return `${lieu || "commune inconnue"} — ${etat}`;
}

async function listerComptes() {
  const agents = await agentsRepo.findAll();
  const agentsTerrain = agents.filter((a) => a.role !== AGENT_ROLES.ADMINISTRATEUR);

  console.log(`${agentsTerrain.length} comptes agents (hors administrateurs purs).`);
  console.log("Le volume est celui du listing espace agent : ce que le compte voit vraiment.");
  console.log();

  for (const agent of agentsTerrain) {
    const input = {
      id: agent.id,
      role: agent.role,
      entrepriseAmoId: agent.entrepriseAmoId,
      allersVersId: agent.allersVersId,
    };

    // Un compte mal configuré (rôle sans structure rattachée) fait échouer le calcul de
    // périmètre — donc l'app entière pour cet agent. On le signale au lieu de tout arrêter :
    // c'est précisément un compte à ne pas choisir pour une session de test.
    let scope, total;
    try {
      scope = await calculateAgentScope(input);
      ({ total } = await getDossiersByAgent(input));
    } catch (error) {
      console.log(`  ${agent.email}`);
      console.log(`      ${agent.role} — COMPTE INEXPLOITABLE : ${(error as Error).message}`);
      continue;
    }

    const territoire = scope.canViewAllDossiers
      ? "national"
      : [
          scope.departements.length ? `dépts ${scope.departements.join(", ")}` : null,
          scope.epcis.length ? `${scope.epcis.length} EPCI` : null,
        ]
          .filter(Boolean)
          .join(" + ") || "aucun territoire";

    console.log(`  ${agent.email}`);
    console.log(`      ${agent.role} — ${await describeStructure(agent)} — ${territoire} — ${total} dossiers visibles`);
  }
  console.log();
  console.log("Puis : pnpm qa:cas-de-test --agent=<email>");
}

function renderTexte(scenario: Scenario, cas: { path: string; dossier: DossierItem }[], baseUrl: string) {
  console.log(`[${scenario.id}] ${scenario.titre} — ${cas.length} cas`);
  if (cas.length === 0) {
    console.log("      aucun cas disponible sur cet environnement pour ce compte");
    console.log(`      (à créer : ${scenario.sert_a})`);
  }
  for (const { path, dossier } of cas) {
    console.log(`      ${baseUrl}${path}`);
    console.log(`          ${resume(dossier)}`);
  }
  console.log();
}

function renderMarkdown(scenario: Scenario, cas: { path: string; dossier: DossierItem }[], baseUrl: string) {
  console.log(`**${scenario.titre}** — ${scenario.sert_a}`);
  if (cas.length === 0) {
    console.log(`- [ ] AUCUN CAS DISPONIBLE — créer la précondition avant de tester`);
  }
  for (const { path, dossier } of cas) {
    console.log(`- [ ] [${resume(dossier)}](${baseUrl}${path})`);
  }
  console.log();
}

async function listerCasDeTest(email: string) {
  const agent = await agentsRepo.findByEmail(email);
  if (!agent) {
    console.error(`Aucun agent avec l'email "${email}". Lancer --comptes pour voir la liste.`);
    process.exit(1);
  }

  const scenarios = SCENARIO_ID ? SCENARIOS.filter((s) => s.id === SCENARIO_ID) : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(`Scénario "${SCENARIO_ID}" inconnu. Disponibles : ${SCENARIOS.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  const { dossiers, territoiresCouverts } = await getDossiersByAgent({
    id: agent.id,
    role: agent.role,
    entrepriseAmoId: agent.entrepriseAmoId,
    allersVersId: agent.allersVersId,
  });

  const ctx: ScenarioContext = {
    parcoursAvecActionSysteme: await findParcoursAvecActionSysteme(dossiers.map((d) => d.parcoursId)),
  };

  const baseUrl = getServerEnv().BASE_URL.replace(/\/$/, "");
  const territoire = territoiresCouverts.departements.length
    ? `dépts ${territoiresCouverts.departements.join(", ")}`
    : "national ou par entreprise";

  if (!MARKDOWN) {
    line();
    console.log(`CAS DE TEST — ${agent.email}`);
    console.log(`${agent.role} — ${await describeStructure(agent)} — ${territoire} — ${dossiers.length} dossiers vus`);
    line();
    console.log();
  } else {
    console.log(`## Cas de test — compte \`${agent.email}\` (${agent.role})`);
    console.log();
  }

  for (const scenario of scenarios) {
    const retenus = dossiers.filter((d) => scenario.matches(d, ctx)).slice(0, LIMIT);
    const cas = [];
    for (const dossier of retenus) {
      // Même résolution qu'au clic dans le back-office : dossier, demande ou prospect.
      const path = await resolveEspaceAgentPath(dossier.parcoursId);
      if (path) cas.push({ path, dossier });
    }
    if (MARKDOWN) renderMarkdown(scenario, cas, baseUrl);
    else renderTexte(scenario, cas, baseUrl);
  }

  if (!MARKDOWN) {
    console.log("Les cas se consomment : relancer le script à chaque session de test.");
  }
}

async function main() {
  if (!COMPTES && !AGENT_EMAIL) {
    console.error("Indiquer un compte : --agent=<email>, ou --comptes pour lister les comptes disponibles.");
    process.exit(1);
  }

  if (COMPTES) await listerComptes();
  else await listerCasDeTest(AGENT_EMAIL!);

  await rawClient.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  rawClient.end();
  process.exit(1);
});
