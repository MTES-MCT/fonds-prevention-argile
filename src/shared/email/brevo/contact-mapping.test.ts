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
  it("mappe les champs de base + A_AMO=false par défaut", () => {
    const attrs = buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs).toMatchObject({
      [BREVO_ATTRS.PRENOM]: "Jean",
      [BREVO_ATTRS.NOM]: "Dupont",
      [BREVO_ATTRS.DATE_INSCRIPTION]: "2026-07-21",
      [BREVO_ATTRS.SITUATION]: "prospect",
      [BREVO_ATTRS.ETAPE]: "choix_amo",
      [BREVO_ATTRS.STATUT]: "todo",
      [BREVO_ATTRS.A_AMO]: false,
      [BREVO_ATTRS.DEPARTEMENT]: "36",
      [BREVO_ATTRS.INSEE]: "36044",
    });
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
