import { describe, it, expect } from "vitest";
import { buildContactAttributes } from "./contact-mapping";
import { BREVO_ATTRS } from "./brevo-contacts.config";
import type { User } from "@/shared/database/schema/users";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";

const user = (over: Partial<User> = {}): User =>
  ({
    id: "u1",
    prenom: "Jean",
    nom: "Dupont",
    email: "jean@gmail.com",
    emailContact: null,
    sourceAcquisition: null,
    ...over,
  }) as User;

const parcours = (over: Partial<ParcoursPrevention> = {}): ParcoursPrevention =>
  ({
    id: "p1",
    userId: "u1",
    currentStep: "choix_amo",
    currentStatus: "todo",
    situationParticulier: "prospect",
    createdAt: new Date("2026-07-21T10:00:00Z"),
    rgaSimulationData: { logement: { code_departement: "36", commune: "36044" } },
    rgaSimulationDataAgent: null,
    ...over,
  }) as unknown as ParcoursPrevention;

describe("buildContactAttributes", () => {
  it("mappe les champs de base", () => {
    const attrs = buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs).toMatchObject({
      [BREVO_ATTRS.PRENOM]: "Jean",
      [BREVO_ATTRS.NOM]: "Dupont",
      [BREVO_ATTRS.DATE_INSCRIPTION]: "2026-07-21",
      [BREVO_ATTRS.SITUATION]: "prospect",
      [BREVO_ATTRS.ETAPE]: "choix_amo",
      [BREVO_ATTRS.STATUT]: "todo",
      [BREVO_ATTRS.DEPARTEMENT]: "36",
      [BREVO_ATTRS.INSEE]: "36044",
    });
  });

  it("n'inclut pas A_AMO dans la base (posé par les hooks, sinon un dn_update l'écraserait)", () => {
    const attrs = buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs[BREVO_ATTRS.A_AMO]).toBeUndefined();
  });

  it("priorise les données agent (getEffectiveRGAData) pour l'INSEE/département", () => {
    const attrs = buildContactAttributes(
      user(),
      parcours({
        rgaSimulationData: { logement: { commune: "36044" } } as never,
        rgaSimulationDataAgent: { logement: { commune: "75056" } } as never,
      }),
      "jean@gmail.com"
    );
    expect(attrs[BREVO_ATTRS.INSEE]).toBe("75056");
    expect(attrs[BREVO_ATTRS.DEPARTEMENT]).toBe("75");
  });

  it("renormalise un INSEE stocké en nombre (récupère les zéros initiaux) et en dérive le département", () => {
    const attrs = buildContactAttributes(
      user(),
      parcours({ rgaSimulationData: { logement: { commune: 1234 } } as never }),
      "jean@gmail.com"
    );
    expect(attrs[BREVO_ATTRS.INSEE]).toBe("01234");
    expect(attrs[BREVO_ATTRS.DEPARTEMENT]).toBe("01");
  });

  it("EMAIL_REEL présent quand l'email poussé diffère du vrai (staging sous-adressé)", () => {
    const attrs = buildContactAttributes(user(), parcours(), "marie+uu1@beta.gouv.fr");
    expect(attrs[BREVO_ATTRS.EMAIL_REEL]).toBe("jean@gmail.com");
  });

  it("EMAIL_REEL absent en production (email poussé == vrai)", () => {
    const attrs = buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs[BREVO_ATTRS.EMAIL_REEL]).toBeUndefined();
  });

  it("omet les champs vides plutôt que d'écraser Brevo", () => {
    const attrs = buildContactAttributes(
      user({ prenom: null }),
      parcours({ rgaSimulationData: null }),
      "jean@gmail.com"
    );
    expect(attrs[BREVO_ATTRS.PRENOM]).toBeUndefined();
    expect(attrs[BREVO_ATTRS.DEPARTEMENT]).toBeUndefined();
  });
});
