import { describe, it, expect, vi, beforeEach } from "vitest";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

const { entreprisesAmoRepo, allersVersRepository } = vi.hoisted(() => ({
  entreprisesAmoRepo: { findById: vi.fn() },
  allersVersRepository: { findByDepartement: vi.fn() },
}));

vi.mock("@/shared/database", () => ({
  entreprisesAmoRepo,
  allersVersRepository,
}));

import { resolveResponsables } from "./responsable-resolver.service";

describe("resolveResponsables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("résout un dossier AMO (EN_ATTENTE) avec le nom de l'entreprise", async () => {
    entreprisesAmoRepo.findById.mockResolvedValue({ id: "amo-1", nom: "Entreprise A" });
    allersVersRepository.findByDepartement.mockResolvedValue([{ id: "av-1", nom: "ADIL 36" }]);

    const map = await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entrepriseAmoId: "amo-1" },
      },
    ]);

    expect(map.get("p1")).toMatchObject({ type: "AMO", entrepriseId: "amo-1", entrepriseNom: "Entreprise A" });
    expect(entreprisesAmoRepo.findById).toHaveBeenCalledTimes(1);
    expect(allersVersRepository.findByDepartement).toHaveBeenCalledTimes(1);
  });

  it("résout un dossier sans validation comme AV territorial", async () => {
    allersVersRepository.findByDepartement.mockResolvedValue([{ id: "av-1", nom: "ADIL 36" }]);

    const map = await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        validation: null,
      },
    ]);

    expect(map.get("p1")).toMatchObject({ type: "AV", structureId: "av-1", structureNom: "ADIL 36" });
    expect(entreprisesAmoRepo.findById).not.toHaveBeenCalled();
  });

  it("dé-duplique les requêtes pour des dossiers partageant les mêmes ids", async () => {
    entreprisesAmoRepo.findById.mockResolvedValue({ id: "amo-1", nom: "Entreprise A" });
    allersVersRepository.findByDepartement.mockResolvedValue([{ id: "av-1", nom: "ADIL 36" }]);

    await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entrepriseAmoId: "amo-1" },
      },
      {
        parcoursId: "p2",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entrepriseAmoId: "amo-1" },
      },
    ]);

    expect(entreprisesAmoRepo.findById).toHaveBeenCalledTimes(1);
    expect(allersVersRepository.findByDepartement).toHaveBeenCalledTimes(1);
  });

  it("retourne ARCHIVE pour un dossier archivé sans charger d'AMO", async () => {
    allersVersRepository.findByDepartement.mockResolvedValue([]);

    const map = await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: new Date(),
        currentStatus: Status.TODO,
        codeDepartement: "36",
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entrepriseAmoId: "amo-1" },
      },
    ]);

    expect(map.get("p1")).toEqual({ type: "ARCHIVE" });
  });
});
