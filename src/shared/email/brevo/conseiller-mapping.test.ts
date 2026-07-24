import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveResponsableForParcours, entreprisesAmoRepo, allersVersRepository } = vi.hoisted(() => ({
  resolveResponsableForParcours: vi.fn(),
  entreprisesAmoRepo: { findById: vi.fn() },
  allersVersRepository: { findById: vi.fn() },
}));

vi.mock("@/features/backoffice/espace-agent/dossiers/services/responsable-resolver.service", () => ({
  resolveResponsableForParcours,
}));

vi.mock("@/shared/database/repositories", () => ({
  entreprisesAmoRepo,
  allersVersRepository,
}));

import { buildConseillerEventProperties } from "./conseiller-mapping";

describe("buildConseillerEventProperties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne les attributs de l'AMO responsable (premier email valide de la liste)", async () => {
    resolveResponsableForParcours.mockResolvedValue({
      type: "AMO",
      entrepriseId: "amo-1",
      entrepriseNom: "Entreprise A",
      codeDepartement: "36",
    });
    entreprisesAmoRepo.findById.mockResolvedValue({
      id: "amo-1",
      nom: "Entreprise A",
      emails: "contact@amo-a.fr;autre@amo-a.fr",
      telephone: "0102030405",
      horaires: "Du lundi au vendredi 9h-17h",
    });

    const props = await buildConseillerEventProperties("p1");

    expect(props).toEqual({
      conseiller_type: "AMO",
      conseiller_nom: "Entreprise A",
      conseiller_email: "contact@amo-a.fr",
      conseiller_telephone: "0102030405",
      conseiller_horaires: "Du lundi au vendredi 9h-17h",
    });
  });

  it("retourne les attributs de l'Aller-vers responsable et omet les horaires absents", async () => {
    resolveResponsableForParcours.mockResolvedValue({
      type: "AV",
      structureId: "av-1",
      structureNom: "ADIL 36",
      codeDepartement: "36",
    });
    allersVersRepository.findById.mockResolvedValue({
      id: "av-1",
      nom: "ADIL 36",
      emails: ["contact@adil36.fr"],
      telephone: "0102030405",
      horaires: null,
    });

    const props = await buildConseillerEventProperties("p1");

    expect(props).toEqual({
      conseiller_type: "ALLERS_VERS",
      conseiller_nom: "ADIL 36",
      conseiller_email: "contact@adil36.fr",
      conseiller_telephone: "0102030405",
    });
  });

  it("retourne un objet vide si aucun responsable n'est résolu (parcours introuvable)", async () => {
    resolveResponsableForParcours.mockResolvedValue(null);

    const props = await buildConseillerEventProperties("p1");

    expect(props).toEqual({});
    expect(entreprisesAmoRepo.findById).not.toHaveBeenCalled();
    expect(allersVersRepository.findById).not.toHaveBeenCalled();
  });

  it("retourne un objet vide si le responsable est INDETERMINE", async () => {
    resolveResponsableForParcours.mockResolvedValue({ type: "INDETERMINE" });

    const props = await buildConseillerEventProperties("p1");

    expect(props).toEqual({});
  });

  it("retourne un objet vide si l'entreprise AMO résolue n'existe plus", async () => {
    resolveResponsableForParcours.mockResolvedValue({
      type: "AMO",
      entrepriseId: "amo-1",
      entrepriseNom: "Entreprise A",
      codeDepartement: "36",
    });
    entreprisesAmoRepo.findById.mockResolvedValue(null);

    const props = await buildConseillerEventProperties("p1");

    expect(props).toEqual({});
  });

  it("retourne un objet vide si l'Aller-vers résolu n'existe plus", async () => {
    resolveResponsableForParcours.mockResolvedValue({
      type: "AV",
      structureId: "av-1",
      structureNom: "ADIL 36",
      codeDepartement: "36",
    });
    allersVersRepository.findById.mockResolvedValue(null);

    const props = await buildConseillerEventProperties("p1");

    expect(props).toEqual({});
  });
});
