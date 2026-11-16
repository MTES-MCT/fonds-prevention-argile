import { beforeEach, describe, expect, it, vi } from "vitest";
import { enregistrerAvis } from "../services/avis.service";
import { enregistrerAvisAction } from "./avis.actions";

vi.mock("../services/avis.service", () => ({ enregistrerAvis: vi.fn() }));

const service = vi.mocked(enregistrerAvis);
const PARCOURS_ID = "5b2f6f0e-8a57-4c59-9d0b-0f3c1c7d2a11";
const valide = { sujet: "devis", parcoursId: PARCOURS_ID, note: 4, origine: "mail" };

describe("enregistrerAvisAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.mockResolvedValue({ enregistre: true, avisId: null });
  });

  it("enregistre une charge utile valide", async () => {
    expect(await enregistrerAvisAction(valide)).toEqual({ success: true, data: { avisId: null } });
    expect(service).toHaveBeenCalledWith(valide);
  });

  it.each([
    ["une note hors échelle", { ...valide, note: 6 }],
    ["une note décimale", { ...valide, note: 3.5 }],
    ["un sujet inconnu", { ...valide, sujet: "paiement" }],
    ["une étape sans parcours", { sujet: "devis", note: 4, origine: "mail" }],
    ["un parcours qui n'est pas un uuid", { ...valide, parcoursId: "1 OR 1=1" }],
    ["une origine inconnue", { ...valide, origine: "sms" }],
    ["un commentaire trop long", { ...valide, note: 1, commentaire: "a".repeat(1001) }],
    ["un département mal formé", { sujet: "simulateur", note: 4, origine: "en_direct", codeDepartement: "Indre" }],
    ["rien", undefined],
  ])("refuse %s sans appeler le service", async (_cas, payload) => {
    expect((await enregistrerAvisAction(payload)).success).toBe(false);
    expect(service).not.toHaveBeenCalled();
  });

  it("ne transmet pas un parcours sur un avis de simulateur", async () => {
    await enregistrerAvisAction({ sujet: "simulateur", note: 4, origine: "en_direct", parcoursId: PARCOURS_ID });

    expect(service.mock.calls[0][0]).not.toHaveProperty("parcoursId");
  });

  it("vide un commentaire fait d'espaces", async () => {
    await enregistrerAvisAction({ ...valide, note: 1, commentaire: "   " });

    expect(service.mock.calls[0][0].commentaire).toBeUndefined();
  });

  it("répond par une erreur quand le service refuse", async () => {
    service.mockResolvedValue({ enregistre: false });

    expect((await enregistrerAvisAction(valide)).success).toBe(false);
  });

  it("répond par une erreur, sans la propager, quand la base échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    service.mockRejectedValue(new Error("connexion perdue"));

    expect((await enregistrerAvisAction(valide)).success).toBe(false);
  });
});
