import { beforeEach, describe, expect, it, vi } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { AgentScope } from "@/features/auth/permissions/domain/types/agent-scope.types";

const { findById, getParcoursByTerritoire, calculateAgentScope, getCentresCommunes } = vi.hoisted(() => ({
  findById: vi.fn(),
  getParcoursByTerritoire: vi.fn(),
  calculateAgentScope: vi.fn(),
  getCentresCommunes: vi.fn(),
}));

// Résolution des responsables réelle : seules les tables sont simulées, pour que les refus soient ceux du listing.
vi.mock("@/shared/database", () => ({
  db: {},
  parcoursRepo: { findById, getParcoursByTerritoire },
  parcoursActionsRepo: { getLastActionByParcoursIds: vi.fn() },
  entreprisesAmoRepo: { findById: async (id: string) => ({ id, nom: id }) },
  allersVersRepository: {
    findByEpciWithDepartementFallback: async (departement: string) =>
      departement === "36" ? [{ id: "av-36", nom: "Adil 36" }] : [],
    getDepartementsByAllersVersId: async (id: string) => (id === "av-36" ? ["36"] : id === "av-32" ? ["32"] : []),
  },
}));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({ calculateAgentScope }));
vi.mock("@/features/backoffice/administration/demandeurs/services/centres-communes.service", () => ({
  getCentresCommunes,
}));

import { chargerDemandeursProches } from "./demandeurs-proches.service";

const MAISON = "amo-maison";
const BERRY = "amo-berry";

function logement(coordonnees: string, commune = "36044") {
  return { logement: { commune_nom: "Châteauroux", commune, code_departement: "36", epci: "243600327", coordonnees } };
}

function ligne(
  parcoursId: string,
  nom: string,
  currentStep: Step,
  coordonnees: string,
  validation: { statut: StatutValidationAmo; entrepriseAmoId: string | null } | null,
  dsStatus: DSStatus | null = null
) {
  return {
    parcoursId,
    currentStep,
    currentStatus: Status.TODO,
    archivedAt: null,
    rgaSimulationData: logement(coordonnees),
    rgaSimulationDataAgent: null,
    userPrenom: nom,
    userNom: "Test",
    validationId: validation ? `v-${parcoursId}` : null,
    validationStatut: validation?.statut ?? null,
    entrepriseAmoId: validation?.entrepriseAmoId ?? null,
    dsStatus,
    instructedAt: null,
  };
}

const eligible = (entrepriseAmoId: string) => ({ statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entrepriseAmoId });
const autonome = { statut: StatutValidationAmo.SANS_AMO, entrepriseAmoId: null };

const LIGNES = [
  ligne("p0", "Origine", Step.DIAGNOSTIC, "46.8100,1.6900", eligible(MAISON)),
  ligne("p1", "AutreAmo", Step.DIAGNOSTIC, "46.8115,1.6880", eligible(BERRY)),
  ligne("p2", "Deposee", Step.ELIGIBILITE, "46.8300,1.7000", eligible(MAISON), DSStatus.EN_INSTRUCTION),
  ligne("p3", "SansGps", Step.DIAGNOSTIC, "", eligible(MAISON)),
  ligne("p4", "Autonome", Step.ELIGIBILITE, "46.7500,1.7200", autonome),
  ligne("p5", "Refusee", Step.ELIGIBILITE, "46.8105,1.6905", {
    statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
    entrepriseAmoId: MAISON,
  }),
  ligne("p6", "Prospect", Step.ELIGIBILITE, "46.9000,1.9000", null),
];

function scope(overrides: Partial<AgentScope>): AgentScope {
  return {
    isNational: false,
    entrepriseAmoIds: [],
    departements: ["36"],
    epcis: [],
    canViewAllDossiers: false,
    canViewDossiersByEntreprise: false,
    canViewDossiersWithoutAmo: false,
    ...overrides,
  };
}

const AMO = { id: "a1", role: UserRole.AMO, entrepriseAmoId: MAISON, allersVersId: null };
const AV = { id: "a2", role: UserRole.ALLERS_VERS, entrepriseAmoId: null, allersVersId: "av-36" };
const HYBRIDE = { id: "a3", role: UserRole.AMO_ET_ALLERS_VERS, entrepriseAmoId: BERRY, allersVersId: "av-36" };
const DOSSIER = { parcoursId: "p0", validationStatut: StatutValidationAmo.LOGEMENT_ELIGIBLE };

function noms(resultat: Awaited<ReturnType<typeof chargerDemandeursProches>>) {
  return resultat?.voisins.map((v) => v.nom.replace(" Test", ""));
}

describe("chargerDemandeursProches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue({ ...LIGNES[0], id: "p0" });
    getParcoursByTerritoire.mockResolvedValue(LIGNES);
    calculateAgentScope.mockResolvedValue(scope({ entrepriseAmoIds: [MAISON], canViewDossiersByEntreprise: true }));
    getCentresCommunes.mockResolvedValue({ centres: { "36044": [1.6903, 46.8023] }, departementsEnEchec: [] });
  });

  it("cherche dans le périmètre du listing, aux étapes voisines, sans les archivés", async () => {
    await chargerDemandeursProches(AMO, DOSSIER);

    expect(getParcoursByTerritoire).toHaveBeenCalledWith(
      { kind: "territoire", departements: ["36"], epcis: [] },
      { steps: [Step.DIAGNOSTIC, Step.ELIGIBILITE], nonArchives: true }
    );
  });

  it("ne propose à une AMO que les dossiers de son entreprise, jamais ceux d'une autre AMO voisine", async () => {
    const resultat = await chargerDemandeursProches(AMO, DOSSIER);

    expect(noms(resultat)).toEqual(["SansGps", "Deposee"]);
    expect(resultat?.mesDossiers).toBe(true);
  });

  it("ne propose à un Aller-vers que les dossiers sans AMO de son territoire", async () => {
    calculateAgentScope.mockResolvedValue(scope({ canViewDossiersWithoutAmo: true }));

    const resultat = await chargerDemandeursProches(AV, DOSSIER);

    expect(noms(resultat)).toEqual(["Autonome", "Prospect"]);
  });

  it("n'ouvre rien à un Aller-vers d'un autre territoire, même si des lignes lui parvenaient", async () => {
    calculateAgentScope.mockResolvedValue(scope({ departements: ["32"], canViewDossiersWithoutAmo: true }));

    const resultat = await chargerDemandeursProches({ ...AV, allersVersId: "av-32" }, DOSSIER);

    expect(resultat?.voisins).toEqual([]);
  });

  it("réunit les deux côtés d'un agent hybride", async () => {
    calculateAgentScope.mockResolvedValue(scope({ entrepriseAmoIds: [BERRY], canViewDossiersByEntreprise: true }));

    const resultat = await chargerDemandeursProches(HYBRIDE, DOSSIER);

    expect(noms(resultat)).toEqual(["AutreAmo", "Autonome", "Prospect"]);
  });

  it("donne au super-administrateur tout son périmètre, sans dossier refusé ni le dossier lui-même", async () => {
    calculateAgentScope.mockResolvedValue(scope({ departements: [], isNational: true, canViewAllDossiers: true }));

    const resultat = await chargerDemandeursProches(
      { id: "s", role: UserRole.SUPER_ADMINISTRATEUR, entrepriseAmoId: null, allersVersId: null },
      DOSSIER
    );

    expect(getParcoursByTerritoire).toHaveBeenCalledWith({ kind: "national" }, expect.anything());
    expect(noms(resultat)).toEqual(["AutreAmo", "SansGps", "Deposee", "Autonome", "Prospect"]);
    expect(resultat?.mesDossiers).toBe(false);
  });

  it("décrit chaque voisin pour la carte et la liste", async () => {
    const [sansGps, deposee] = (await chargerDemandeursProches(AMO, DOSSIER))!.voisins;

    expect(sansGps).toMatchObject({
      rang: 1,
      positionApproximative: true,
      distance: "environ 1 km",
      etape: "Diagnostic logement",
      href: "/espace-agent/dossiers/v-p3",
    });
    expect(deposee).toMatchObject({ rang: 2, chezLaDdt: true, distance: "2,4 km", codeDepartement: "36" });
  });

  it("écarte sans erreur un voisin dont le centre de commune n'a pas pu être lu", async () => {
    getCentresCommunes.mockResolvedValue({ centres: {}, departementsEnEchec: ["36"] });

    expect(noms(await chargerDemandeursProches(AMO, DOSSIER))).toEqual(["Deposee"]);
  });

  it("n'a pas d'encart aux devis, ni pour un logement sans position", async () => {
    findById.mockResolvedValueOnce({ ...LIGNES[0], currentStep: Step.DEVIS });
    expect(await chargerDemandeursProches(AMO, DOSSIER)).toBeNull();
    expect(getParcoursByTerritoire).not.toHaveBeenCalled();

    findById.mockResolvedValueOnce({ ...LIGNES[0], rgaSimulationData: logement("", "36999") });
    expect(await chargerDemandeursProches(AMO, DOSSIER)).toBeNull();
  });

  it("n'interroge pas la base pour un agent sans périmètre", async () => {
    calculateAgentScope.mockResolvedValue(scope({ departements: [] }));

    expect((await chargerDemandeursProches(AMO, DOSSIER))?.voisins).toEqual([]);
    expect(getParcoursByTerritoire).not.toHaveBeenCalled();
  });
});
