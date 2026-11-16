import { beforeEach, describe, expect, it, vi } from "vitest";
import { avisRepo, parcoursRepo } from "@/shared/database/repositories";
import { enregistrerAvis } from "./avis.service";

vi.mock("@/shared/database/repositories", () => ({
  avisRepo: { create: vi.fn(), upsertPourParcours: vi.fn(), updateAnonyme: vi.fn() },
  parcoursRepo: { findById: vi.fn() },
}));

const PARCOURS_ID = "5b2f6f0e-8a57-4c59-9d0b-0f3c1c7d2a11";
const AVIS_ID = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

const findParcours = vi.mocked(parcoursRepo.findById);
const upsert = vi.mocked(avisRepo.upsertPourParcours);
const create = vi.mocked(avisRepo.create);
const updateAnonyme = vi.mocked(avisRepo.updateAnonyme);

describe("enregistrerAvis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findParcours.mockResolvedValue({ id: PARCOURS_ID } as never);
    create.mockResolvedValue({ id: AVIS_ID } as never);
  });

  describe("étape d'un parcours", () => {
    const base = { sujet: "diagnostic", parcoursId: PARCOURS_ID, origine: "mail" } as const;

    it("enregistre la note sur le parcours, sans renvoyer d'identifiant", async () => {
      const resultat = await enregistrerAvis({ ...base, note: 4 });

      expect(resultat).toEqual({ enregistre: true, avisId: null });
      expect(upsert).toHaveBeenCalledWith({
        parcoursId: PARCOURS_ID,
        sujet: "diagnostic",
        note: 4,
        origine: "mail",
        commentaire: null,
      });
    });

    it("refuse un parcours inconnu sans rien écrire", async () => {
      findParcours.mockResolvedValue(null);

      expect(await enregistrerAvis({ ...base, note: 4 })).toEqual({ enregistre: false });
      expect(upsert).not.toHaveBeenCalled();
    });

    it("garde le commentaire déjà saisi quand une note basse arrive sans texte", async () => {
      await enregistrerAvis({ ...base, note: 2 });

      expect(upsert.mock.calls[0][0].commentaire).toBeUndefined();
    });

    it("enregistre le commentaire d'une note basse", async () => {
      await enregistrerAvis({ ...base, note: 1, commentaire: "Le formulaire a planté" });

      expect(upsert.mock.calls[0][0].commentaire).toBe("Le formulaire a planté");
    });

    it("efface le commentaire quand la note ne demande plus d'explication", async () => {
      await enregistrerAvis({ ...base, note: 5, commentaire: "reste d'une saisie précédente" });

      expect(upsert.mock.calls[0][0].commentaire).toBeNull();
    });
  });

  describe("simulateur, anonyme", () => {
    const base = { sujet: "simulateur", origine: "en_direct" } as const;

    it("crée un avis sans parcours et renvoie son identifiant", async () => {
      const resultat = await enregistrerAvis({ ...base, note: 3, simulationEligible: false, codeDepartement: "36" });

      expect(resultat).toEqual({ enregistre: true, avisId: AVIS_ID });
      expect(create).toHaveBeenCalledWith({
        sujet: "simulateur",
        note: 3,
        commentaire: null,
        origine: "en_direct",
        simulationEligible: false,
        codeDepartement: "36",
      });
      expect(findParcours).not.toHaveBeenCalled();
    });

    it("complète l'avis déjà créé plutôt que d'en créer un second", async () => {
      updateAnonyme.mockResolvedValue({ id: AVIS_ID } as never);

      const resultat = await enregistrerAvis({ ...base, note: 2, commentaire: "Carte illisible", avisId: AVIS_ID });

      expect(resultat).toEqual({ enregistre: true, avisId: AVIS_ID });
      expect(updateAnonyme).toHaveBeenCalledWith(AVIS_ID, "simulateur", { note: 2, commentaire: "Carte illisible" });
      expect(create).not.toHaveBeenCalled();
    });

    it("refuse un identifiant qui ne désigne pas un avis anonyme", async () => {
      updateAnonyme.mockResolvedValue(null);

      expect(await enregistrerAvis({ ...base, note: 2, avisId: AVIS_ID })).toEqual({ enregistre: false });
      expect(create).not.toHaveBeenCalled();
    });
  });
});
