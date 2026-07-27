import { describe, it, expect, vi, beforeEach } from "vitest";
import { BREVO_ATTRS } from "./brevo-contacts.config";

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

import { buildConseillerAttributes, buildConseillerAttributesFromAmo } from "./conseiller-mapping";

describe("buildConseillerAttributesFromAmo", () => {
  it("mappe les attributs à partir d'une AMO déjà en main (premier email valide)", () => {
    const attrs = buildConseillerAttributesFromAmo({
      nom: "Entreprise A",
      emails: "contact@amo-a.fr;autre@amo-a.fr",
      telephone: "0102030405",
      horaires: "Du lundi au vendredi 9h-17h",
    });

    expect(attrs).toEqual({
      [BREVO_ATTRS.CONSEILLER_TYPE]: "AMO",
      [BREVO_ATTRS.CONSEILLER_NOM]: "Entreprise A",
      [BREVO_ATTRS.CONSEILLER_EMAIL]: "contact@amo-a.fr",
      [BREVO_ATTRS.CONSEILLER_TELEPHONE]: "0102030405",
      [BREVO_ATTRS.CONSEILLER_HORAIRES]: "Du lundi au vendredi 9h-17h",
    });
  });

  it("omet les horaires absents plutôt que d'écraser Brevo avec une valeur vide", () => {
    const attrs = buildConseillerAttributesFromAmo({
      nom: "Entreprise A",
      emails: "contact@amo-a.fr",
      telephone: "0102030405",
      horaires: null,
    });

    expect(attrs[BREVO_ATTRS.CONSEILLER_HORAIRES]).toBeUndefined();
  });
});

describe("buildConseillerAttributes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne les attributs de l'AMO responsable", async () => {
    resolveResponsableForParcours.mockResolvedValue({
      type: "AMO",
      entrepriseId: "amo-1",
      entrepriseNom: "Entreprise A",
      codeDepartement: "36",
    });
    entreprisesAmoRepo.findById.mockResolvedValue({
      id: "amo-1",
      nom: "Entreprise A",
      emails: "contact@amo-a.fr",
      telephone: "0102030405",
      horaires: "Du lundi au vendredi 9h-17h",
    });

    const attrs = await buildConseillerAttributes("p1");

    expect(attrs).toEqual({
      [BREVO_ATTRS.CONSEILLER_TYPE]: "AMO",
      [BREVO_ATTRS.CONSEILLER_NOM]: "Entreprise A",
      [BREVO_ATTRS.CONSEILLER_EMAIL]: "contact@amo-a.fr",
      [BREVO_ATTRS.CONSEILLER_TELEPHONE]: "0102030405",
      [BREVO_ATTRS.CONSEILLER_HORAIRES]: "Du lundi au vendredi 9h-17h",
    });
  });

  it("retourne les attributs de l'Aller-vers responsable", async () => {
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

    const attrs = await buildConseillerAttributes("p1");

    expect(attrs).toEqual({
      [BREVO_ATTRS.CONSEILLER_TYPE]: "ALLERS_VERS",
      [BREVO_ATTRS.CONSEILLER_NOM]: "ADIL 36",
      [BREVO_ATTRS.CONSEILLER_EMAIL]: "contact@adil36.fr",
      [BREVO_ATTRS.CONSEILLER_TELEPHONE]: "0102030405",
    });
  });

  it("retourne un objet vide si aucun responsable n'est résolu (parcours introuvable)", async () => {
    resolveResponsableForParcours.mockResolvedValue(null);

    const attrs = await buildConseillerAttributes("p1");

    expect(attrs).toEqual({});
    expect(entreprisesAmoRepo.findById).not.toHaveBeenCalled();
    expect(allersVersRepository.findById).not.toHaveBeenCalled();
  });

  it("retourne un objet vide si le responsable est INDETERMINE", async () => {
    resolveResponsableForParcours.mockResolvedValue({ type: "INDETERMINE" });

    const attrs = await buildConseillerAttributes("p1");

    expect(attrs).toEqual({});
  });

  it("retourne un objet vide si l'entreprise AMO résolue n'existe plus", async () => {
    resolveResponsableForParcours.mockResolvedValue({
      type: "AMO",
      entrepriseId: "amo-1",
      entrepriseNom: "Entreprise A",
      codeDepartement: "36",
    });
    entreprisesAmoRepo.findById.mockResolvedValue(null);

    const attrs = await buildConseillerAttributes("p1");

    expect(attrs).toEqual({});
  });

  it("retourne un objet vide si l'Aller-vers résolu n'existe plus", async () => {
    resolveResponsableForParcours.mockResolvedValue({
      type: "AV",
      structureId: "av-1",
      structureNom: "ADIL 36",
      codeDepartement: "36",
    });
    allersVersRepository.findById.mockResolvedValue(null);

    const attrs = await buildConseillerAttributes("p1");

    expect(attrs).toEqual({});
  });

  it("best-effort : retourne un objet vide si la résolution jette (ne fait jamais échouer l'appelant)", async () => {
    resolveResponsableForParcours.mockRejectedValue(new Error("DB down"));

    const attrs = await buildConseillerAttributes("p1");

    expect(attrs).toEqual({});
  });
});
