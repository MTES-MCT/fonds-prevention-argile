import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { fonctionsExportees, listerFichiersServer } from "@/shared/testing/server-exports";
import { EVENEMENTS_SECURITE } from "@/shared/services/journal-securite/journal-securite";

// Toute action d'administration écrit au journal de sécurité, sauf si elle est déclarée ici comme une lecture.
// Une action nouvelle échoue donc tant qu'on n'a pas tranché : elle journalise, ou elle ne fait que lire.
const DOSSIER = "src/features/backoffice/administration";

const LECTURES = new Set([
  "acquisition/actions/get-statistiques.action.ts › getStatistiquesAction",
  "activite/actions/activite.actions.ts › getActiviteStatsAction",
  "agents/actions/agents.actions.ts › getAgentsAction",
  "agents/actions/agents.actions.ts › getAgentByIdAction",
  "agents/actions/agents.actions.ts › getStructuresOptionsAction",
  "agents/actions/agents.actions.ts › getAgentTracesAction",
  "agents/actions/agents.actions.ts › getAgentListesDiffusionAction",
  "commentaires/actions/commentaires-admin.actions.ts › getCommentairesAdminAction",
  "demandeurs/actions/carte-demandeurs.actions.ts › getCentresCommunesAction",
  "demandeurs/actions/carte-demandeurs.actions.ts › getContourDepartementAction",
  "demandeurs/actions/couverture-territoriale.actions.ts › getDepartementsNonCouvertsAction",
  "demandeurs/actions/users-tracking.actions.ts › getUsersForStats",
  "demandeurs/actions/users-tracking.actions.ts › getUsersWithParcours",
  "diagnostics/actions/amo-a-rattacher.actions.ts › listerDossiersARattacherAction",
  "diagnostics/actions/diagnostics.actions.ts › listDiagnosticsAction",
  "diagnostics/actions/diagnostics.actions.ts › getDemarchesSanteAction",
  "diagnostics/actions/diagnostics.actions.ts › getParcoursDiagnosticDetailAction",
  "diagnostics/actions/diagnostics.actions.ts › searchEligibiliteByEmailAction",
  "diagnostics/actions/reconciliation.actions.ts › listerFilesReconciliationAction",
  "diagnostics/actions/reconciliation.actions.ts › inspecterDossierDnAction",
  "structures/actions/structures.actions.ts › getStructuresAction",
  "structures/actions/structures.actions.ts › getReferentielEpciAction",
  "structures/actions/structures.actions.ts › getFicheStructureAction",
  "synchronisations/actions/sync-runs.actions.ts › listSyncRunsAction",
  "synchronisations/actions/sync-runs.actions.ts › getSyncRunDetailAction",
  "tableau-de-bord/actions/tableau-de-bord.actions.ts › getTableauDeBordStatsAction",
  "tableau-de-bord/actions/tableau-de-bord.actions.ts › getMatomoSimulationsStatsAction",
  "tableau-de-bord/actions/tableau-de-bord.actions.ts › getDepartementsDisponiblesAction",
  "tableau-de-bord/actions/tableau-de-bord.actions.ts › getAutresDemandesArchiveesAction",
  "tableau-de-bord/actions/tableau-de-bord.actions.ts › getTopDepartementsMatomoAction",
  "tableau-de-bord/actions/tableau-de-bord.actions.ts › getTopCommunesMatomoAction",
  "tableau-de-bord/actions/tableau-de-bord.actions.ts › getEligibiliteStatsAction",
  "vulnerabilite/actions/vulnerabilite-stats.actions.ts › getVulnerabiliteStatsAction",
  "vulnerabilite/actions/vulnerabilite-stats.actions.ts › getVulnerabiliteTopDepartementsAction",
  "vulnerabilite/actions/vulnerabilite-stats.actions.ts › getVulnerabiliteFunnelAction",
  "vulnerabilite/actions/vulnerabilite-stats.actions.ts › getVulnerabiliteComptesStatsAction",
]);

const actions = listerFichiersServer(DOSSIER).flatMap((chemin) =>
  fonctionsExportees(chemin).map((fonction) => ({
    cle: `${relative(DOSSIER, chemin)} › ${fonction.nom}`,
    corps: fonction.corps,
  }))
);

const EVENEMENT_JOURNALISE = /journaliser\(\{\s*evenement: "([a-z_]+)"/g;

describe("journal de sécurité des actions d'administration", () => {
  it("trouve des actions à contrôler", () => {
    expect(actions.length).toBeGreaterThan(30);
  });

  it("toute action qui n'est pas une lecture déclarée journalise un évènement connu", () => {
    const fautives = actions
      .filter(({ cle }) => !LECTURES.has(cle))
      .filter(({ corps }) => {
        const evenements = [...corps.matchAll(EVENEMENT_JOURNALISE)].map((trouve) => trouve[1]);
        return (
          evenements.length === 0 || evenements.some((nom) => !(EVENEMENTS_SECURITE as readonly string[]).includes(nom))
        );
      })
      .map(({ cle }) => cle);

    expect(fautives).toEqual([]);
  });

  it("une lecture déclarée n'écrit pas au journal et existe encore", () => {
    const connues = new Map(actions.map(({ cle, corps }) => [cle, corps]));
    const perimees = [...LECTURES].filter((cle) => !connues.has(cle));
    const quiJournalisent = [...LECTURES].filter((cle) => connues.get(cle)?.includes("journaliser("));

    expect(perimees).toEqual([]);
    expect(quiJournalisent).toEqual([]);
  });
});
