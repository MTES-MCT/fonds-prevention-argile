import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "../domain/value-objects";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn(), update: vi.fn(), transaction: vi.fn() },
}));
vi.mock("../../dossiers-ds/services/dossier-ds.service", () => ({
  getDossierByStep: vi.fn(),
}));
vi.mock("@/shared/email/actions/send-arret-accompagnement.actions", () => ({
  sendArretAccompagnementInfoEmail: vi.fn().mockResolvedValue({ success: true, data: {} }),
  sendArretAccompagnementValidationEmail: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));
vi.mock("./detachement-amo.service", () => ({
  detacherAmo: vi.fn(),
}));

import { annulerAccompagnementDemandeur } from "./arret-accompagnement.service";
import { getDossierByStep } from "../../dossiers-ds/services/dossier-ds.service";
import { detacherAmo } from "./detachement-amo.service";
import {
  sendArretAccompagnementInfoEmail,
  sendArretAccompagnementValidationEmail,
} from "@/shared/email/actions/send-arret-accompagnement.actions";

function mockSelectOnce(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

// Commune 75001 -> département 75, facultatif (les obligatoires par défaut : 3, 36, 47, 54, 81).
const parcours = { id: "p1", userId: "u1", rgaSimulationData: { logement: { commune: "75001" } } };
/** Indre (36) : AMO obligatoire → aucune autonomie possible. */
const parcoursAmoObligatoire = { ...parcours, rgaSimulationData: { logement: { commune: "36044" } } };
const validationMandataire = {
  id: "val-1",
  statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
  estMandataireFinancier: true,
  demandeArretAt: null,
  entrepriseAmoId: "e1",
  userPrenom: "Georges",
  userNom: "Abitbol",
};
const entreprise = { nom: "SOLHA Indre", emails: "contact@solha.fr" };

describe("annulerAccompagnementDemandeur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDossierByStep).mockResolvedValue(null as never);
    vi.mocked(db.update).mockReturnValue({
      set: () => ({ where: () => Promise.resolve(undefined) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(detacherAmo).mockResolvedValue({
      success: true,
      data: {
        etapeAvancee: true,
        entrepriseAmoId: "e1",
        amoNom: "SOLHA Indre",
        amoEmails: "contact@solha.fr",
        demandeurNom: "Abitbol",
        demandeurPrenom: "Georges",
      },
    });
  });

  it("AMO mandataire ayant validé : enregistre une demande d'accord, ne détache pas", async () => {
    mockSelectOnce([parcours]);
    mockSelectOnce([validationMandataire]);
    mockSelectOnce([entreprise]);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outcome).toBe("demande_enregistree");
    expect(detacherAmo).not.toHaveBeenCalled();
    expect(sendArretAccompagnementValidationEmail).toHaveBeenCalled();
  });

  it("AMO non mandataire : détache immédiatement et envoie le mail d'info", async () => {
    mockSelectOnce([parcours]);
    mockSelectOnce([{ ...validationMandataire, estMandataireFinancier: false }]);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outcome).toBe("detache");
    expect(detacherAmo).toHaveBeenCalledWith({ parcoursId: "p1" });
    expect(sendArretAccompagnementInfoEmail).toHaveBeenCalled();
  });

  it("AMO mandataire mais pas encore validante : détache immédiatement", async () => {
    mockSelectOnce([parcours]);
    mockSelectOnce([{ ...validationMandataire, statut: StatutValidationAmo.EN_ATTENTE }]);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outcome).toBe("detache");
    expect(detacherAmo).toHaveBeenCalled();
  });

  it("mandataire non renseigné (null) : traité comme non-mandataire, détache", async () => {
    mockSelectOnce([parcours]);
    mockSelectOnce([{ ...validationMandataire, estMandataireFinancier: null }]);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outcome).toBe("detache");
  });

  it("bloque si le formulaire d'éligibilité est en instruction", async () => {
    mockSelectOnce([parcours]);
    mockSelectOnce([validationMandataire]);
    vi.mocked(getDossierByStep).mockResolvedValue({ dsStatus: DSStatus.EN_INSTRUCTION } as never);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("instruction");
    expect(detacherAmo).not.toHaveBeenCalled();
  });

  it("bloque si une demande d'arrêt est déjà en attente", async () => {
    mockSelectOnce([parcours]);
    mockSelectOnce([{ ...validationMandataire, demandeArretAt: new Date() }]);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("déjà en attente");
  });

  it("refuse l'annulation dans un département où l'AMO est obligatoire", async () => {
    mockSelectOnce([parcoursAmoObligatoire]);
    mockSelectOnce([validationMandataire]);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("obligatoire pour ce département");
    expect(detacherAmo).not.toHaveBeenCalled();
  });

  it("refuse si le parcours est déjà sans AMO", async () => {
    mockSelectOnce([parcours]);
    mockSelectOnce([{ ...validationMandataire, statut: StatutValidationAmo.SANS_AMO }]);

    const result = await annulerAccompagnementDemandeur({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("autonomie");
  });
});
