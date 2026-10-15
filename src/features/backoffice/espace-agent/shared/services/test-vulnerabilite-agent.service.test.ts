import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { getDossierSimulationData } from "./edition-simulation.service";
import {
  peutFaireTestVulnerabilitePourDemandeur,
  resoudreDossierTestVulnerabilite,
} from "./test-vulnerabilite-agent.service";

vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("./edition-simulation.service", () => ({ getDossierSimulationData: vi.fn() }));

const mockedUser = vi.mocked(getCurrentUser);
const mockedDossier = vi.mocked(getDossierSimulationData);

const DOSSIER = {
  success: true as const,
  data: {
    dossierId: "val-1",
    parcoursId: "parcours-1",
    prenom: "Angela",
    nom: "Dubois",
    statut: "logement_eligible",
    rgaData: {
      logement: {
        adresse: "97 Rue de Notz 36000 Châteauroux",
        commune: "36044",
        commune_nom: "Châteauroux",
        clef_ban: "36044_2080_00097",
        coordonnees: "46.8,1.68",
        code_departement: "36",
      },
    },
  },
};

describe("peutFaireTestVulnerabilitePourDemandeur", () => {
  it.each([UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS])("accepte %s", (role) => {
    expect(peutFaireTestVulnerabilitePourDemandeur(role)).toBe(true);
  });

  it.each([UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR, UserRole.ANALYSTE, UserRole.PARTICULIER])(
    "refuse %s",
    (role) => {
      expect(peutFaireTestVulnerabilitePourDemandeur(role)).toBe(false);
    }
  );
});

describe("resoudreDossierTestVulnerabilite", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("refuse sans session, sans lire le dossier", async () => {
    mockedUser.mockResolvedValue(null as never);

    expect(await resoudreDossierTestVulnerabilite("val-1")).toEqual({ success: false, error: "Non authentifié" });
    expect(mockedDossier).not.toHaveBeenCalled();
  });

  it.each([UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR, UserRole.ANALYSTE])(
    "refuse %s avant toute lecture du dossier",
    async (role) => {
      mockedUser.mockResolvedValue({ role } as never);

      const resultat = await resoudreDossierTestVulnerabilite("val-1");

      expect(resultat.success).toBe(false);
      expect(mockedDossier).not.toHaveBeenCalled();
    }
  );

  it("relaie le refus du périmètre du dossier (ownership ou territoire)", async () => {
    mockedUser.mockResolvedValue({ role: UserRole.AMO } as never);
    mockedDossier.mockResolvedValue({ success: false, error: "Ce dossier ne vous est pas destiné" });

    expect(await resoudreDossierTestVulnerabilite("val-1")).toEqual({
      success: false,
      error: "Ce dossier ne vous est pas destiné",
    });
  });

  it("renvoie le demandeur et l'adresse de sa simulation", async () => {
    mockedUser.mockResolvedValue({ role: UserRole.AMO } as never);
    mockedDossier.mockResolvedValue(DOSSIER as never);

    const resultat = await resoudreDossierTestVulnerabilite("val-1");

    expect(resultat).toMatchObject({
      success: true,
      data: { parcoursId: "parcours-1", nomDemandeur: "Angela Dubois", adresse: { clefBan: "36044_2080_00097" } },
    });
  });
});
