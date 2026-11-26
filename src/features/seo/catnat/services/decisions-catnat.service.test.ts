import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NewCatnatDecision } from "@/shared/database/schema/catnat-decisions";
import { catnatDecisionsRepository } from "@/shared/database/repositories";
import * as adaptateur from "../adapters/datagouv";
import { decisionsCatnatService } from "./decisions-catnat.service";

vi.mock("../adapters/datagouv");
vi.mock("@/shared/database/repositories", () => ({ catnatDecisionsRepository: { remplacerSource: vi.fn() } }));
vi.mock("../../services/territoires.service", () => ({
  getAllCommunes: () => [{ codeInsee: "36044" }, { codeInsee: "54395" }],
}));

const decision = (codeInsee: string, type: NewCatnatDecision["decision"] = "non_reconnue"): NewCatnatDecision => ({
  codeInsee,
  libelleCommune: "Commune",
  dateArrete: "2026-05-11",
  datePublicationJo: "2026-05-14",
  dateDebutEvt: "2025-01-01",
  dateFinEvt: "2025-12-31",
  decision: type,
  motif: type === "reconnue" ? null : "critère météorologique non satisfait",
  source: "data.gouv",
});

describe("decisionsCatnatService.importerCocon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catnatDecisionsRepository.remplacerSource).mockResolvedValue({ ajoutees: 2, retirees: 0 });
  });

  it("n'écrit que les décisions des communes suivies, et retire celles que la source ne publie plus", async () => {
    vi.mocked(adaptateur.fetchDecisionsSecheresse).mockResolvedValue({
      decisions: [decision("36044"), decision("54395", "reconnue"), decision("75056")],
      ecartees: 0,
    });

    const bilan = await decisionsCatnatService.importerCocon();

    expect(catnatDecisionsRepository.remplacerSource).toHaveBeenCalledWith(
      "data.gouv",
      [decision("36044"), decision("54395", "reconnue")],
      { retirerAbsentes: true }
    );
    expect(bilan).toEqual({ lues: 3, retenues: 2, nonReconnues: 1, ecartees: 0, ajoutees: 2, retirees: 0 });
  });

  it("une ligne illisible dans le fichier → écriture seule, aucune décision retirée", async () => {
    vi.mocked(adaptateur.fetchDecisionsSecheresse).mockResolvedValue({ decisions: [decision("36044")], ecartees: 1 });

    await decisionsCatnatService.importerCocon();

    expect(catnatDecisionsRepository.remplacerSource).toHaveBeenCalledWith("data.gouv", expect.any(Array), {
      retirerAbsentes: false,
    });
  });

  it("aucune décision pour nos communes → erreur, la base n'est pas touchée", async () => {
    vi.mocked(adaptateur.fetchDecisionsSecheresse).mockResolvedValue({ decisions: [decision("75056")], ecartees: 0 });

    await expect(decisionsCatnatService.importerCocon()).rejects.toThrow(/aucune décision/);
    expect(catnatDecisionsRepository.remplacerSource).not.toHaveBeenCalled();
  });
});
