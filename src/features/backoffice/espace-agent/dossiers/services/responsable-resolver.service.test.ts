import { describe, it, expect, vi, beforeEach } from "vitest";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

const { entreprisesAmoRepo, allersVersRepository } = vi.hoisted(() => ({
  entreprisesAmoRepo: { findById: vi.fn() },
  allersVersRepository: { findByEpciWithDepartementFallback: vi.fn() },
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

  it("résout un dossier AMO (EN_ATTENTE) avec le nom de l'entreprise et un état EN_ATTENTE_AMO", async () => {
    entreprisesAmoRepo.findById.mockResolvedValue({ id: "amo-1", nom: "Entreprise A" });
    allersVersRepository.findByEpciWithDepartementFallback.mockResolvedValue([{ id: "av-1", nom: "ADIL 36" }]);

    const map = await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        codeEpci: "200000172",
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entrepriseAmoId: "amo-1" },
      },
    ]);

    expect(map.get("p1")?.responsable).toMatchObject({ type: "AMO", entrepriseId: "amo-1", entrepriseNom: "Entreprise A" });
    expect(map.get("p1")?.etat).toBe("EN_ATTENTE_AMO");
    expect(entreprisesAmoRepo.findById).toHaveBeenCalledTimes(1);
    expect(allersVersRepository.findByEpciWithDepartementFallback).toHaveBeenCalledWith("36", "200000172");
  });

  it("résout un dossier sans validation comme AV territorial avec état AV_QUALIFICATION", async () => {
    allersVersRepository.findByEpciWithDepartementFallback.mockResolvedValue([{ id: "av-1", nom: "ADIL 36" }]);

    const map = await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        codeEpci: "200000172",
        validation: null,
      },
    ]);

    expect(map.get("p1")?.responsable).toMatchObject({ type: "AV", structureId: "av-1", structureNom: "ADIL 36" });
    expect(map.get("p1")?.etat).toBe("AV_QUALIFICATION");
    expect(entreprisesAmoRepo.findById).not.toHaveBeenCalled();
  });

  it("appelle findByEpciWithDepartementFallback avec EPCI undefined si aucun EPCI fourni", async () => {
    allersVersRepository.findByEpciWithDepartementFallback.mockResolvedValue([{ id: "av-1", nom: "ADIL 36" }]);

    await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        codeEpci: null,
        validation: null,
      },
    ]);

    expect(allersVersRepository.findByEpciWithDepartementFallback).toHaveBeenCalledWith("36", undefined);
  });

  it("dé-duplique les requêtes AV par couple (EPCI, département)", async () => {
    entreprisesAmoRepo.findById.mockResolvedValue({ id: "amo-1", nom: "Entreprise A" });
    allersVersRepository.findByEpciWithDepartementFallback.mockResolvedValue([{ id: "av-1", nom: "ADIL 36" }]);

    await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        codeEpci: "200000172",
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entrepriseAmoId: "amo-1" },
      },
      {
        parcoursId: "p2",
        archivedAt: null,
        currentStatus: Status.TODO,
        codeDepartement: "36",
        codeEpci: "200000172",
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entrepriseAmoId: "amo-1" },
      },
    ]);

    expect(entreprisesAmoRepo.findById).toHaveBeenCalledTimes(1);
    expect(allersVersRepository.findByEpciWithDepartementFallback).toHaveBeenCalledTimes(1);
  });

  it("dossier archivé : responsable ARCHIVE + état ARCHIVE", async () => {
    allersVersRepository.findByEpciWithDepartementFallback.mockResolvedValue([]);

    const map = await resolveResponsables([
      {
        parcoursId: "p1",
        archivedAt: new Date("2026-01-15"),
        currentStatus: Status.TODO,
        codeDepartement: "36",
        codeEpci: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entrepriseAmoId: "amo-1" },
      },
    ]);

    expect(map.get("p1")?.responsable).toEqual({ type: "ARCHIVE" });
    expect(map.get("p1")?.etat).toBe("ARCHIVE");
  });
});
