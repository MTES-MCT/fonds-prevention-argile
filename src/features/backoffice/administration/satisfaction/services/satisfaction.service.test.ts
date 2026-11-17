import { beforeEach, describe, expect, it, vi } from "vitest";
import { avisRepo } from "@/shared/database/repositories";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { getSatisfaction } from "./satisfaction.service";

vi.mock("@/shared/database/repositories", () => ({
  avisRepo: { findNotes: vi.fn(), findCommentaires: vi.fn() },
}));
vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: vi.fn(() => true),
}));

const findNotes = vi.mocked(avisRepo.findNotes);
const findCommentaires = vi.mocked(avisRepo.findCommentaires);

describe("getSatisfaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(true);
    findNotes.mockResolvedValue([{ sujet: "diagnostic", note: 4 }]);
    findCommentaires.mockResolvedValue([
      { id: "a1", sujet: "diagnostic", note: 1, commentaire: "Trop long", createdAt: new Date("2026-11-10T09:00:00Z") },
    ]);
  });

  it("ne charge pas les commentaires pour qui n'a pas le droit de les lire", async () => {
    const resultat = await getSatisfaction({ avecCommentaires: false });

    expect(resultat.commentaires).toBeNull();
    expect(findCommentaires).not.toHaveBeenCalled();
    expect(resultat.stats.find((s) => s.sujet === "diagnostic")?.reponses).toBe(1);
  });

  it("renvoie les commentaires avec le libellé du sujet", async () => {
    const resultat = await getSatisfaction({ avecCommentaires: true });

    expect(resultat.commentaires).toEqual([
      { id: "a1", libelle: "Diagnostic", note: 1, commentaire: "Trop long", date: "2026-11-10T09:00:00.000Z" },
    ]);
  });

  it("masque le simulateur de vulnérabilité là où il n'est pas servi", async () => {
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(false);

    const { stats } = await getSatisfaction({ avecCommentaires: false });

    expect(stats.map((s) => s.sujet)).not.toContain("vulnerabilite");
    expect(stats).toHaveLength(7);
  });
});
